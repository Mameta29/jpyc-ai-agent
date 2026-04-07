import { jpycAgent } from "@/lib/mastra/agent";
import type { NextRequest } from "next/server";

/**
 * AI AgentのAPIを呼び出すエンドポイント
 * @param req
 * @returns
 */
export async function POST(req: NextRequest) {
	try {
		// リクエストパラメータからメッセージ、会話履歴、プロフィール、友達リストを取得
		const {
			message,
			messages: history,
			conversationId,
			profile,
			friends,
		} = await req.json();

		if (!message) {
			return new Response(
				JSON.stringify({ success: false, error: "Message is required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// プロフィールと友達リストをコンテキストとして追加
		let contextMessage = message;
		if (profile || (friends && friends.length > 0)) {
			let context = "\n\n[ユーザー情報]\n";

			if (profile) {
				context += `- 自分の名前: ${profile.name}\n`;
				context += `- 自分のアドレス: ${profile.address}\n`;
			}

			if (friends && friends.length > 0) {
				context += "\n[友達リスト]\n";
				for (const friend of friends) {
					context += `- ${friend.name}: ${friend.address}\n`;
				}
			}

			contextMessage = message + context;
		}

		// 会話履歴を構築
		const mastraMessages: Array<{
			role: "user" | "assistant";
			content: string;
		}> = [];
		if (history && Array.isArray(history)) {
			for (const msg of history) {
				mastraMessages.push({
					role: msg.role as "user" | "assistant",
					content: msg.content,
				});
			}
		}
		// 最新のユーザーメッセージを追加
		mastraMessages.push({ role: "user" as const, content: contextMessage });

		// Mastraで定義したJPYC AI Agentの機能を呼び出す
		const response = await jpycAgent.generate(
			mastraMessages as Parameters<typeof jpycAgent.generate>[0],
			{
				...(conversationId && { conversationId }),
			},
		);

		console.log("Generate response summary:", {
			text: response.text,
			textLength: response.text?.length,
			steps: response.steps?.length,
			toolResults: response.toolResults?.length,
		});

		// レスポンスからチェーン情報を抽出
		const responseText = response.text || "エージェントからの応答がありませんでした";
		const chainMatch = responseText.match(/\[CHAIN:(sepolia|amoy|fuji)\]/);
		const chain = chainMatch ? chainMatch[1] : null;
		// チェーンタグをテキストから除去
		const cleanText = responseText.replace(/\s*\[CHAIN:(sepolia|amoy|fuji)\]/, "").trim();

		const CHAIN_NAMES: Record<string, string> = {
			sepolia: "Ethereum Sepolia",
			amoy: "Polygon Amoy",
			fuji: "Avalanche Fuji",
		};

		return new Response(
			JSON.stringify({
				text: cleanText,
				chain: chain,
				chainName: chain ? CHAIN_NAMES[chain] : null,
			}),
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Chat API Error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error:
					error instanceof Error
						? error.message
						: "An error occurred while processing your request",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
