import { getCurrentChain, getChainName } from "@/lib/jpyc/client";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		const currentChain = getCurrentChain();
		const chainName = getChainName(currentChain);

		return NextResponse.json({
			success: true,
			chain: currentChain,
			chainName: chainName,
		});
	} catch (error: any) {
		console.error("Chain API Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to get current chain",
			},
			{ status: 500 },
		);
	}
}

// POSTメソッドも許可（念のため）
export async function POST() {
	return GET();
}
