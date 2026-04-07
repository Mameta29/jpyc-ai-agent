import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
	getChainName,
	getCurrentAddress,
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
		"指定したチェーンで指定したアドレスのJPYC残高を照会します。アドレスが指定されていない場合は、現在のウォレットアドレスの残高を返します。",
	inputSchema: z.object({
		chain: z
			.enum(["sepolia", "amoy", "fuji"])
			.describe(
				"照会するチェーン: sepolia (Ethereum), amoy (Polygon), fuji (Avalanche)",
			),
		address: z
			.string()
			.optional()
			.describe(
				"残高を照会するEthereumアドレス（省略時は現在のウォレットアドレス）",
			),
	}),
	execute: async ({ context }) => {
		try {
			const { chain, address } = context;
			switchChain(chain as SupportedChain);
			const chainName = getChainName(chain as SupportedChain);
			const targetAddress = address || getCurrentAddress();
			const balanceString = await jpyc.balanceOf({
				account: targetAddress as `0x${string}`,
			});

			return {
				success: true,
				address: targetAddress,
				balance: `${balanceString} JPYC`,
				balanceRaw: balanceString,
				chain: chain,
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
		"指定したチェーンでJPYCトークンを指定したアドレスに送金します。例: Sepoliaで10 JPYCを0x123...に送る",
	inputSchema: z.object({
		chain: z
			.enum(["sepolia", "amoy", "fuji"])
			.describe(
				"送金するチェーン: sepolia (Ethereum), amoy (Polygon), fuji (Avalanche)",
			),
		to: z.string().describe("送信先のEthereumアドレス (0xから始まる42文字)"),
		amount: z.number().describe("送金額（JPYC単位、例: 10）"),
	}),
	execute: async ({ context }) => {
		try {
			const { chain, to, amount } = context;
			switchChain(chain as SupportedChain);
			const chainName = getChainName(chain as SupportedChain);
			const txHash = await jpyc.transfer({
				to: to as `0x${string}`,
				value: amount,
			});

			const explorerUrl = EXPLORER_URLS[chain as SupportedChain];

			return {
				success: true,
				message: `${amount} JPYCを ${to} に送金しました（${chainName}）`,
				transactionHash: txHash,
				explorerUrl: `${explorerUrl}${txHash}`,
				chain: chain,
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

export const jpycTotalSupplyTool = createTool({
	id: "jpyc_total_supply",
	description:
		"指定したチェーンでのJPYCの総供給量を照会します。ユーザーが「総供給量は？」「流通量を教えて」などと聞いた場合に使用します。",
	inputSchema: z.object({
		chain: z
			.enum(["sepolia", "amoy", "fuji"])
			.describe(
				"照会するチェーン: sepolia (Ethereum), amoy (Polygon), fuji (Avalanche)",
			),
	}),
	execute: async ({ context }) => {
		try {
			const { chain } = context;
			switchChain(chain as SupportedChain);
			const chainName = getChainName(chain as SupportedChain);
			const totalSupply = await jpyc.totalSupply();

			return {
				success: true,
				totalSupply: `${totalSupply} JPYC`,
				totalSupplyRaw: totalSupply,
				chain: chain,
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
	jpyc_total_supply: jpycTotalSupplyTool,
};
