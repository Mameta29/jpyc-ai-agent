import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

// Claude 3.5 Sonnetモデルを使用
const claude = anthropic("claude-sonnet-4-0");

// Mastra用のOpenAIプロバイダーを作成
const openai = createOpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// gpt-4o-miniモデルを使用（安価で高速、推論トークンなし）
const gpt4oMiniModel = openai("gpt-4o-mini");
// gemini-2.5-flash-lite: 無料枠あり、上限が緩い
const googleProvider = createGoogleGenerativeAI({
	apiKey: process.env.GEMINI_API_KEY,
});
const gemini = googleProvider("gemini-2.5-flash-lite");

export { claude, gemini, gpt4oMiniModel };
