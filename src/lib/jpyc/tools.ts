import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
	getChainName,
	getCurrentAddress,
	getCurrentChain,
	jpyc,
	type SupportedChain,
	switchChain,
} from "./client";

const EXPLORER_URLS: Record<SupportedChain, string> = {
	sepolia: "https://sepolia.etherscan.io/tx/",
	amoy: "https://amoy.polygonscan.com/tx/",
	fuji: "https://testnet.snowtrace.io/tx/",
};

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
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);
			const targetAddress = address || getCurrentAddress();
			const balanceString = await jpyc.balanceOf({
				account: targetAddress as `0x${string}`,
			});

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
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);
			const txHash = await jpyc.transfer({
				to: to as `0x${string}`,
				value: amount,
			});

			const explorerUrl = EXPLORER_URLS[currentChain];

			return {
				success: true,
				message: `${amount} JPYCを ${to} に送金しました（${chainName}）`,
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
			const previousChain = getCurrentChain();
			switchChain(chain as SupportedChain);

			const newChainName = getChainName(chain as SupportedChain);
			const previousChainName = getChainName(previousChain);

			return {
				success: true,
				message: `チェーンを ${previousChainName} から ${newChainName} に切り替えました`,
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

export const jpycGetCurrentChainTool = createTool({
	id: "jpyc_get_current_chain",
	description:
		"現在選択されているテストネットを取得します。ユーザーが「今どのチェーン？」「現在のネットワークは？」などと聞いた場合に使用します。",
	inputSchema: z.object({
		_dummy: z.string().optional().describe("ダミーパラメータ（使用しません）"),
	}),
	execute: async () => {
		try {
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);

			return {
				success: true,
				chain: currentChain,
				chainName: chainName,
				address: getCurrentAddress(),
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});

export const jpycTotalSupplyTool = createTool({
	id: "jpyc_total_supply",
	description:
		"現在選択されているテストネットでのJPYCの総供給量を照会します。ユーザーが「総供給量は？」「流通量を教えて」などと聞いた場合に使用します。",
	inputSchema: z.object({
		_dummy: z.string().optional().describe("ダミーパラメータ（使用しません）"),
	}),
	execute: async () => {
		try {
			const currentChain = getCurrentChain();
			const chainName = getChainName(currentChain);
			const totalSupply = await jpyc.totalSupply();

			return {
				success: true,
				totalSupply: `${totalSupply} JPYC`,
				totalSupplyRaw: totalSupply,
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

export const jpycTools = {
	jpyc_balance: jpycBalanceTool,
	jpyc_transfer: jpycTransferTool,
	jpyc_switch_chain: jpycSwitchChainTool,
	jpyc_get_current_chain: jpycGetCurrentChainTool,
	jpyc_total_supply: jpycTotalSupplyTool,
};
