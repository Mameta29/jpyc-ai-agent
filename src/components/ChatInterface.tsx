"use client";

import {
	addFriend,
	deleteFriend,
	deleteProfile,
	type Friend,
	getFriends,
	getProfile,
	setProfile,
	type UserProfile,
} from "@/lib/storage/localStorage";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
};

/**
 * ChatInterfaceコンポーネント
 * @returns
 */
export default function ChatInterface() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [currentChainName, setCurrentChainName] =
		useState<string>("Loading...");
	const [profile, setProfileState] = useState<UserProfile | null>(null);
	const [friends, setFriendsState] = useState<Friend[]>([]);
	const [showSettings, setShowSettings] = useState(false);
	const [profileName, setProfileName] = useState("");
	const [friendName, setFriendName] = useState("");
	const [friendAddress, setFriendAddress] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// メッセージが更新されたら自動スクロール
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, loading]);

	// プロフィールと友達リストを読み込む
	useEffect(() => {
		setProfileState(getProfile());
		setFriendsState(getFriends());
	}, []);

	// 現在のチェーンを取得
	useEffect(() => {
		const fetchCurrentChain = async () => {
			try {
				const response = await fetch("/api/chain");
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.json();
				if (data.success) {
					setCurrentChainName(data.chainName);
				} else {
					throw new Error(data.error || "Unknown error");
				}
			} catch (error) {
				console.error("Failed to fetch current chain:", error);
				// エラー時はデフォルト値を設定
				setCurrentChainName("Ethereum Sepolia");
			}
		};

		// 初回取得
		fetchCurrentChain();

		// メッセージが更新されたときもチェーンを再取得（チェーン切り替えを反映）
		const interval = setInterval(fetchCurrentChain, 3000);
		return () => clearInterval(interval);
	}, [messages]);

	const sendMessage = async () => {
		if (!input.trim()) return;

		const userMessage: Message = {
			role: "user",
			content: input,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setLoading(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: input,
					messages: messages.map((m) => ({
						role: m.role,
						content: m.content,
					})),
					conversationId,
					profile,
					friends,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// ストリーミングレスポンスを処理
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let assistantMessage = "";

			// アシスタントメッセージの枠を追加
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "",
					timestamp: new Date(),
				},
			]);

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value);
					assistantMessage += chunk;

					// メッセージを更新
					setMessages((prev) => {
						const newMessages = [...prev];
						newMessages[newMessages.length - 1] = {
							role: "assistant",
							content: assistantMessage,
							timestamp: new Date(),
						};
						return newMessages;
					});
				}
			}
		} catch (error) {
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: `❌ エラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
					timestamp: new Date(),
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	const handleSaveProfile = async () => {
		if (!profileName.trim()) {
			alert("名前を入力してください");
			return;
		}

		try {
			// サーバーサイドからアドレスを取得
			const response = await fetch("/api/address");
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error);
			}

			const newProfile = setProfile(profileName, data.address);
			setProfileState(newProfile);
			setProfileName("");
			alert("プロフィールを保存しました");
		} catch (error: any) {
			alert(`エラー: ${error.message}`);
		}
	};

	const handleDeleteProfile = () => {
		if (confirm("プロフィールを削除しますか？")) {
			deleteProfile();
			setProfileState(null);
			alert("プロフィールを削除しました");
		}
	};

	const handleAddFriend = () => {
		if (!friendName.trim() || !friendAddress.trim()) {
			alert("名前とアドレスを入力してください");
			return;
		}

		try {
			const newFriend = addFriend(friendName, friendAddress as `0x${string}`);
			setFriendsState(getFriends());
			setFriendName("");
			setFriendAddress("");
			alert(`${newFriend.name}を友達リストに追加しました`);
		} catch (error: any) {
			alert(`エラー: ${error.message}`);
		}
	};

	const handleDeleteFriend = (id: string, name: string) => {
		if (confirm(`${name}を友達リストから削除しますか？`)) {
			deleteFriend(id);
			setFriendsState(getFriends());
			alert(`${name}を削除しました`);
		}
	};

	return (
		<div className="relative flex flex-col h-screen max-w-7xl mx-auto p-6">
			{/* Header - Modern Glassmorphism Design */}
			<div className="glass rounded-2xl mb-6 p-6 border border-primary-500/20 shadow-glow">
				<div className="flex justify-between items-center">
					<div className="flex items-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 bg-primary-500 blur-xl opacity-50 animate-pulse-slow"></div>
							<h1 className="relative text-3xl font-bold gradient-text">
								UNCHAIN × JPYC AI Agent
							</h1>
						</div>
						<div className="h-8 w-px bg-gradient-to-b from-transparent via-primary-500/50 to-transparent"></div>
						<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
							<div className="w-2 h-2 rounded-full bg-accent-green animate-pulse"></div>
							<span className="text-sm font-medium text-primary-300">
								{currentChainName}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{profile && (
							<div className="px-4 py-2 rounded-xl bg-dark-800/50 border border-primary-500/20">
								<span className="text-sm font-medium text-primary-200">
									👤 {profile.name}
								</span>
							</div>
						)}
						<button
							type="button"
							onClick={() => setShowSettings(!showSettings)}
							className="group relative px-5 py-2.5 rounded-xl bg-gradient-primary text-white font-medium overflow-hidden transition-all hover:shadow-glow-lg"
						>
							<span className="relative z-10">
								{showSettings ? "✕ 閉じる" : "⚙️ 設定"}
							</span>
							<div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
						</button>
					</div>
				</div>
			</div>

			{/* Settings Panel - Modern Card Design */}
			{showSettings && (
				<div className="glass rounded-2xl mb-6 p-6 border border-primary-500/20 shadow-glow animate-fadeIn">
					<div className="grid md:grid-cols-2 gap-6">
						{/* Profile Section */}
						<div className="space-y-4">
							<h2 className="text-xl font-bold text-primary-200 flex items-center gap-2">
								<span className="text-2xl">👤</span>
								プロフィール
							</h2>
							{profile ? (
								<div className="space-y-3 p-4 rounded-xl bg-dark-800/50 border border-primary-500/10">
									<div className="space-y-2">
										<p className="text-sm text-dark-400">名前</p>
										<p className="text-lg font-medium text-primary-100">
											{profile.name}
										</p>
									</div>
									<div className="space-y-2">
										<p className="text-sm text-dark-400">アドレス</p>
										<p className="text-sm font-mono text-primary-300 break-all bg-dark-900/50 p-2 rounded-lg">
											{profile.address}
										</p>
									</div>
									<button
										type="button"
										onClick={handleDeleteProfile}
										className="w-full px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all font-medium"
									>
										🗑️ 削除
									</button>
								</div>
							) : (
								<div className="space-y-3">
									<input
										type="text"
										value={profileName}
										onChange={(e) => setProfileName(e.target.value)}
										placeholder="あなたの名前"
										className="w-full px-4 py-3 rounded-xl bg-dark-800/50 border border-primary-500/20 text-primary-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:shadow-glow-sm transition-all"
									/>
									<button
										type="button"
										onClick={handleSaveProfile}
										className="w-full px-4 py-3 rounded-xl bg-gradient-primary text-white font-medium hover:shadow-glow-lg transition-all"
									>
										💾 保存
									</button>
								</div>
							)}
						</div>

						{/* Friends Section */}
						<div className="space-y-4">
							<h2 className="text-xl font-bold text-primary-200 flex items-center gap-2">
								<span className="text-2xl">👥</span>
								友達リスト
							</h2>
							<div className="space-y-3 max-h-64 overflow-y-auto">
								{friends.length === 0 ? (
									<p className="text-sm text-dark-400 text-center py-8">
										友達が登録されていません
									</p>
								) : (
									friends.map((friend) => (
										<div
											key={friend.id}
											className="group flex justify-between items-start p-4 rounded-xl bg-dark-800/50 border border-primary-500/10 hover:border-primary-500/30 transition-all"
										>
											<div className="flex-1 min-w-0 space-y-1">
												<p className="font-medium text-primary-100">
													{friend.name}
												</p>
												<p className="text-xs font-mono text-dark-400 break-all">
													{friend.address}
												</p>
											</div>
											<button
												type="button"
												onClick={() =>
													handleDeleteFriend(friend.id, friend.name)
												}
												className="ml-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-sm opacity-0 group-hover:opacity-100"
											>
												削除
											</button>
										</div>
									))
								)}
							</div>
							<div className="space-y-2 pt-3 border-t border-primary-500/10">
								<input
									type="text"
									value={friendName}
									onChange={(e) => setFriendName(e.target.value)}
									placeholder="友達の名前"
									className="w-full px-4 py-2.5 rounded-xl bg-dark-800/50 border border-primary-500/20 text-primary-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:shadow-glow-sm transition-all"
								/>
								<input
									type="text"
									value={friendAddress}
									onChange={(e) => setFriendAddress(e.target.value)}
									placeholder="0xから始まるアドレス"
									className="w-full px-4 py-2.5 rounded-xl bg-dark-800/50 border border-primary-500/20 text-primary-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:shadow-glow-sm transition-all font-mono text-sm"
								/>
								<button
									type="button"
									onClick={handleAddFriend}
									className="w-full px-4 py-2.5 rounded-xl bg-gradient-primary text-white font-medium hover:shadow-glow-lg transition-all"
								>
									➕ 追加
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Messages Area - Premium Chat Design */}
			<div className="flex-1 overflow-y-auto mb-6 space-y-4 px-2">
				{messages.length === 0 && (
					<div className="glass rounded-2xl p-8 border border-primary-500/20 text-center animate-fadeIn">
						<div className="inline-block p-4 rounded-full bg-primary-500/10 mb-4">
							<span className="text-4xl">🤖</span>
						</div>
						<p className="text-2xl font-bold gradient-text mb-4">
							こんにちは！
						</p>
						<p className="text-dark-300 mb-6">
							JPYCの送金や残高照会をお手伝いします
						</p>
						<div className="grid md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
							<div className="p-4 rounded-xl bg-dark-800/30 border border-primary-500/10">
								<p className="font-semibold text-primary-300 mb-2">
									⚙️ 初期設定
								</p>
								<ul className="text-sm text-dark-300 space-y-1">
									<li>• 名前を登録</li>
									<li>• 友達を追加</li>
								</ul>
							</div>
							<div className="p-4 rounded-xl bg-dark-800/30 border border-primary-500/10">
								<p className="font-semibold text-accent-cyan mb-2">
									🔄 チェーン切り替え
								</p>
								<ul className="text-sm text-dark-300 space-y-1">
									<li>• Sepoliaに切り替え</li>
									<li>• Amoyで実行</li>
								</ul>
							</div>
							<div className="p-4 rounded-xl bg-dark-800/30 border border-primary-500/10">
								<p className="font-semibold text-accent-purple mb-2">
									💰 操作例
								</p>
								<ul className="text-sm text-dark-300 space-y-1">
									<li>• 残高を教えて</li>
									<li>• 100JPYC送って</li>
								</ul>
							</div>
						</div>
					</div>
				)}

				{messages.map((msg) => (
					<div
						key={`${msg.role}-${msg.timestamp.getTime()}`}
						className={`flex animate-fadeIn ${msg.role === "user" ? "justify-end" : "justify-start"}`}
					>
						<div
							className={`max-w-[75%] rounded-2xl p-4 ${
								msg.role === "user"
									? "bg-gradient-primary text-white shadow-glow"
									: "glass border border-primary-500/20"
							}`}
						>
							{msg.role === "assistant" ? (
								<div className="prose prose-sm max-w-none prose-invert">
									<ReactMarkdown
										components={{
											a: ({ node, ...props }) => (
												<a
													{...props}
													className="text-accent-cyan hover:text-accent-cyan/80 underline transition-colors"
													target="_blank"
													rel="noopener noreferrer"
												/>
											),
											p: ({ node, ...props }) => (
												<p
													{...props}
													className="mb-2 last:mb-0 text-dark-100"
												/>
											),
											strong: ({ node, ...props }) => (
												<strong
													{...props}
													className="font-bold text-primary-200"
												/>
											),
										}}
									>
										{msg.content}
									</ReactMarkdown>
								</div>
							) : (
								<p className="whitespace-pre-wrap">{msg.content}</p>
							)}
							<p className="text-xs opacity-60 mt-2">
								{msg.timestamp.toLocaleTimeString("ja-JP")}
							</p>
						</div>
					</div>
				))}

				{loading && (
					<div className="flex justify-start animate-fadeIn">
						<div className="glass rounded-2xl p-4 border border-primary-500/20">
							<div className="flex items-center gap-3">
								<div className="flex gap-1">
									<div
										className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
										style={{ animationDelay: "0ms" }}
									></div>
									<div
										className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
										style={{ animationDelay: "150ms" }}
									></div>
									<div
										className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
										style={{ animationDelay: "300ms" }}
									></div>
								</div>
								<span className="text-sm text-dark-300">AIが考え中...</span>
							</div>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input Area - Premium Input Design */}
			<div className="glass rounded-2xl p-4 border border-primary-500/20 shadow-glow">
				<div className="flex gap-3">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && !loading && sendMessage()}
						placeholder="メッセージを入力... (Enterで送信)"
						disabled={loading}
						className="flex-1 px-5 py-3 rounded-xl bg-dark-800/50 border border-primary-500/20 text-primary-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:shadow-glow-sm transition-all disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={sendMessage}
						disabled={loading || !input.trim()}
						className="group relative px-8 py-3 rounded-xl bg-gradient-primary text-white font-medium overflow-hidden transition-all hover:shadow-glow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
					>
						<span className="relative z-10 flex items-center gap-2">
							<span>送信</span>
							<span className="group-hover:translate-x-1 transition-transform">
								→
							</span>
						</span>
						<div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
					</button>
				</div>
			</div>
		</div>
	);
}
