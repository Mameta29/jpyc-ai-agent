/**
 * JPYC Tools for Mastra
 *
 * JPYC SDKの機能をMastraツールとして提供
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
	getChainName,
	getCurrentAddress,
	getCurrentChain,
	jpyc,
	type SupportedChain,
	switchChain,
} from "./jpyc/sdk";

// エクスプローラーURLマッピング
const EXPLORER_URLS: Record<SupportedChain, string> = {
	sepolia: "https://sepolia.etherscan.io/tx/",
	amoy: "https://amoy.polygonscan.com/tx/",
	fuji: "https://testnet.snowtrace.io/tx/",
};

/**
 * JPYC残高照会ツール
 * 指定したアドレスのJPYC残高を照会します（現在選択されているテストネット）
 */
export const jpycBalanceTool = createTool({
	id: "jpyc_balance",
	description:
		"指定したアドレスのJPYC残高を照会します（現在選択されているテストネット）。アドレスが指定されていない場合は、現在のウォレットアドレスの残高を返します。",
	inputSchema: z.object({
		address: z
			.string()
			.optional()
			.describe(
				"残高を照会するEthereumアドレス（省略時は現在のウォレットアドレス）",
			),
	}),
	execute: async ({ context }) => {
		try {
			const { address } = context;
			// 現在接続中のチェーン情報を取得
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);

			// アドレスが指定されていない場合は、現在のアカウントアドレスを使用
			const targetAddress = address || getCurrentAddress();
			const balanceString = await jpyc.balanceOf({
				account: targetAddress as `0x${string}`,
			});

			console.log(
				`jpyc_balance: address=${targetAddress}, balance=${balanceString} JPYC`,
			);

			return {
				success: true,
				address: targetAddress,
				balance: `${balanceString} JPYC`,
				balanceRaw: balanceString,
				chain: currentChain,
				chainName: chainName,
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * JPYC送金ツール
 * JPYCトークンを指定したアドレスに送金します（現在選択されているテストネット）
 */
export const jpycTransferTool = createTool({
	id: "jpyc_transfer",
	description:
		"JPYCトークンを指定したアドレスに送金します（現在選択されているテストネット）。例: 10 JPYCを0x123...に送る",
	inputSchema: z.object({
		to: z.string().describe("送信先のEthereumアドレス (0xから始まる42文字)"),
		amount: z.number().describe("送金額（JPYC単位、例: 10）"),
	}),
	execute: async ({ context }) => {
		try {
			const { to, amount } = context;
			// 現在接続中のチェーン情報を取得
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);

			// SDKのtransferメソッドを呼び出してJPYCを送金する
			const txHash = await jpyc.transfer({
				to: to as `0x${string}`,
				value: amount,
			});

			const explorerUrl = EXPLORER_URLS[currentChain];

			return {
				success: true,
				message: `✅ ${amount} JPYCを ${to} に送金しました（${chainName}）`,
				transactionHash: txHash,
				explorerUrl: `${explorerUrl}${txHash}`,
				chain: currentChain,
				chainName: chainName,
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * チェーン切り替えツール
 * JPYCを操作するテストネットを切り替えます
 */
export const jpycSwitchChainTool = createTool({
	id: "jpyc_switch_chain",
	description:
		"JPYCを操作するテストネットを切り替えます。対応チェーン: sepolia (Ethereum), amoy (Polygon), fuji (Avalanche)。ユーザーが「Sepoliaで」「Amoyに切り替えて」「Avalancheで実行」などと言った場合に使用します。",
	inputSchema: z.object({
		chain: z
			.enum(["sepolia", "amoy", "fuji"])
			.describe(
				"切り替え先のチェーン: sepolia (Ethereum Sepolia), amoy (Polygon Amoy), fuji (Avalanche Fuji)",
			),
	}),
	execute: async ({ context }) => {
		try {
			const { chain } = context;
			// 接続前のチェーンを取得
			const previousChain = getCurrentChain();
			// チェーンを切り替え
			await switchChain(chain as SupportedChain);

			const newChainName = getChainName(chain as SupportedChain);
			const previousChainName = getChainName(previousChain);

			return {
				success: true,
				message: `✅ チェーンを ${previousChainName} から ${newChainName} に切り替えました`,
				previousChain: previousChain,
				newChain: chain,
				chainName: newChainName,
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * 現在のチェーン取得ツール
 * 現在選択されているテストネットを取得します
 */
export const jpycGetCurrentChainTool = createTool({
	id: "jpyc_get_current_chain",
	description:
		"現在選択されているテストネットを取得します。ユーザーが「今どのチェーン？」「現在のネットワークは？」などと聞いた場合に使用します。",
	inputSchema: z.object({
		_dummy: z.string().optional().describe("ダミーパラメータ（使用しません）"),
	}),
	execute: async ({ context }) => {
		try {
			// 現在接続中のチェーン情報を取得
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);

			console.log(`jpyc_get_current_chain: chain=${currentChain}`);

			return {
				success: true,
				chain: currentChain,
				chainName: chainName,
				address: getCurrentAddress(),
			};
		} catch (error: unknown) {
			console.error(`jpyc_get_current_chain error:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * 総供給量照会ツール
 * 現在選択されているテストネットでのJPYCの総供給量を照会します
 */
export const jpycTotalSupplyTool = createTool({
	id: "jpyc_total_supply",
	description:
		"現在選択されているテストネットでのJPYCの総供給量を照会します。ユーザーが「総供給量は？」「流通量を教えて」などと聞いた場合に使用します。",
	inputSchema: z.object({
		_dummy: z.string().optional().describe("ダミーパラメータ（使用しません）"),
	}),
	execute: async ({ context }) => {
		try {
			// 現在接続中のチェーン情報を取得
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);
			// SDKのtotalSupplyメソッドを呼び出して総供給量を取得する
			const totalSupply = await jpyc.totalSupply();

			console.log(
				`jpyc_total_supply: totalSupply=${totalSupply} JPYC, chain=${currentChain}`,
			);

			return {
				success: true,
				totalSupply: `${totalSupply} JPYC`,
				totalSupplyRaw: totalSupply,
				chain: currentChain,
				chainName: chainName,
			};
		} catch (error: unknown) {
			console.error(`jpyc_total_supply error:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

/**
 * すべてのJPYCツールをエクスポートする
 */
export const jpycTools = {
	jpyc_balance: jpycBalanceTool,
	jpyc_transfer: jpycTransferTool,
	jpyc_switch_chain: jpycSwitchChainTool,
	jpyc_get_current_chain: jpycGetCurrentChainTool,
	jpyc_total_supply: jpycTotalSupplyTool,
};
