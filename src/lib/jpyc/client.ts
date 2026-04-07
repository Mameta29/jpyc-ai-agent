import {
	createPublicClient,
	createWalletClient,
	getContract,
	http,
	parseUnits,
	formatUnits,
	type Address,
	type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, polygonAmoy, avalancheFuji } from "viem/chains";

export type SupportedChain = "sepolia" | "amoy" | "fuji";

const JPYC_ADDRESS =
	"0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29" as const satisfies Address;
const JPYC_DECIMALS = 18;

const CHAIN_CONFIG = {
	sepolia: {
		chain: sepolia,
		rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
		name: "Ethereum Sepolia",
	},
	amoy: {
		chain: polygonAmoy,
		rpcUrl: "https://rpc-amoy.polygon.technology",
		name: "Polygon Amoy",
	},
	fuji: {
		chain: avalancheFuji,
		rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
		name: "Avalanche Fuji",
	},
} as const;

const JPYC_ABI = [
	{
		name: "totalSupply",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		name: "balanceOf",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		name: "transfer",
		type: "function",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
	},
] as const;

let _currentChain: SupportedChain = "sepolia";
let _account: ReturnType<typeof privateKeyToAccount> | null = null;

function getAccount() {
	if (!_account) {
		if (!process.env.PRIVATE_KEY) {
			throw new Error("PRIVATE_KEY environment variable is required");
		}
		_account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
	}
	return _account;
}

function getJpycContract(chain: SupportedChain = _currentChain) {
	const config = CHAIN_CONFIG[chain];
	const transport = http(config.rpcUrl);

	const publicClient = createPublicClient({
		chain: config.chain,
		transport,
	});

	const walletClient = createWalletClient({
		chain: config.chain,
		transport,
		account: getAccount(),
	});

	return getContract({
		address: JPYC_ADDRESS,
		abi: JPYC_ABI,
		client: { public: publicClient, wallet: walletClient },
	});
}

export function switchChain(chain: SupportedChain): void {
	if (!CHAIN_CONFIG[chain]) {
		throw new Error(
			`Unsupported chain: ${chain}. Supported chains: sepolia, amoy, fuji`,
		);
	}
	_currentChain = chain;
}

export function getCurrentChain(): SupportedChain {
	return _currentChain;
}

export function getChainName(chain?: SupportedChain): string {
	const targetChain = chain || _currentChain;
	return CHAIN_CONFIG[targetChain]?.name ?? "Ethereum Sepolia";
}

export function getCurrentAddress(): Hex {
	return getAccount().address;
}

export const jpyc = {
	async totalSupply(): Promise<string> {
		try {
			const contract = getJpycContract();
			const result = await contract.read.totalSupply();
			return formatUnits(result, JPYC_DECIMALS);
		} catch (error: any) {
			console.error("[jpyc.totalSupply] Error:", error);
			throw new Error(`Failed to get total supply: ${error.message}`);
		}
	},

	async balanceOf(params: { account: Hex }): Promise<string> {
		try {
			const contract = getJpycContract();
			const result = await contract.read.balanceOf([params.account]);
			return formatUnits(result, JPYC_DECIMALS);
		} catch (error: any) {
			console.error("[jpyc.balanceOf] Error:", error);
			throw new Error(`Failed to get balance: ${error.message}`);
		}
	},

	async transfer(params: { to: Hex; value: number }): Promise<string> {
		try {
			const contract = getJpycContract();
			const valueInWei = parseUnits(params.value.toString(), JPYC_DECIMALS);
			const hash = await contract.write.transfer([params.to, valueInWei]);
			return hash;
		} catch (error: any) {
			console.error("[jpyc.transfer] Error:", error);
			throw new Error(`Failed to transfer: ${error.message}`);
		}
	},
};
