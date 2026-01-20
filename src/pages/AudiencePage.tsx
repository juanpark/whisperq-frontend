import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReactionButton } from "@/components/ReactionButton";
import type { ReactionType } from "@/types";
import { sendReactionHttp, getReactionDestination, createQuestion } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";

interface SentQuestion {
	id: string;
	text: string;
	timestamp: number;
}

interface Particle {
	id: number;
	x: number;
	y: number;
	endX: number; // Pre-calculated end position
	endY: number;
	color: string;
	size: number;
}

export function AudiencePage() {
	const { sessionCode } = useParams<{ sessionCode: string }>();
	const [question, setQuestion] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [sentQuestions, setSentQuestions] = useState<SentQuestion[]>([]);
	const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
	const [lastClickFeedback, setLastClickFeedback] = useState<string | null>(
		null
	);
	const [showOnboarding, setShowOnboarding] = useState(true);
	const [showAllQuestions, setShowAllQuestions] = useState(false);
	const [particles, setParticles] = useState<Particle[]>([]);
	const particleIdRef = useRef(0);

	// Connect to WebSocket for real-time reactions
	const { sendMessage, isConnected } = useWebSocket({
		sessionId: sessionCode || "",
		onConnect: () => console.log("Audience connected to session:", sessionCode),
	});

	// Check if user has seen onboarding before
	useEffect(() => {
		const hasSeenOnboarding = localStorage.getItem(
			`whisperq_onboarding_${sessionCode}`
		);
		if (hasSeenOnboarding) {
			setShowOnboarding(false);
		}
	}, [sessionCode]);

	// Clean up old timestamps (older than 5 seconds)
	useEffect(() => {
		const interval = setInterval(() => {
			const now = Date.now();
			setClickTimestamps((prev) => prev.filter((ts) => now - ts < 5000));
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	// Clean up particles after animation
	useEffect(() => {
		if (particles.length > 0) {
			const timeout = setTimeout(() => {
				setParticles([]);
			}, 1000);
			return () => clearTimeout(timeout);
		}
	}, [particles]);

	const handleDismissOnboarding = () => {
		localStorage.setItem(`whisperq_onboarding_${sessionCode}`, "true");
		setShowOnboarding(false);
	};

	const createParticles = (x: number, y: number, type: ReactionType) => {
		const baseColor = type === "confused" ? "#F59E0B" : "#3B82F6";
		const newParticles: Particle[] = [];
		const particleCount = 8; // Lightweight but impressive

		for (let i = 0; i < particleCount; i++) {
			const angle = (Math.PI * 2 * i) / particleCount;
			const distance = 40 + Math.random() * 30; // Random distance 40-70px

			newParticles.push({
				id: particleIdRef.current++,
				x,
				y,
				endX: x + Math.cos(angle) * distance,
				endY: y + Math.sin(angle) * distance,
				color: baseColor,
				size: 6 + Math.random() * 4, // Random size 6-10px
			});
		}

		setParticles(newParticles);
	};

	const handleReaction = useCallback(
		async (type: ReactionType, e: React.MouseEvent) => {
			const now = Date.now();
			const recentClicks = clickTimestamps.filter((ts) => now - ts < 5000);

			// Add current click
			const newClicks = [...recentClicks, now];
			setClickTimestamps(newClicks);

			// Determine click type (급박 클릭 = 5+ clicks in 5 seconds)
			const isRapidClick = newClicks.length >= 5;

			// Create particle effect at click position
			createParticles(e.clientX, e.clientY, type);

			// Haptic feedback
			if (navigator.vibrate) {
				if (isRapidClick) {
					// Stronger haptic for rapid click pattern
					navigator.vibrate([100, 50, 100]);
				} else {
					// Normal haptic
					navigator.vibrate(50);
				}
			}

			// Show feedback for rapid click
			if (isRapidClick && newClicks.length === 5) {
				setLastClickFeedback("강하게 전달됐어요!");
				setTimeout(() => setLastClickFeedback(null), 2000);
			}

			// Send to backend
			try {
				const backendType = type === "confused" ? "CONFUSED" : "MORE";
				if (isConnected) {
					sendMessage(getReactionDestination(), {
						sessionId: sessionCode,
						type: backendType,
					});
				} else {
					await sendReactionHttp(sessionCode || "", backendType);
				}
			} catch (error) {
				console.error("Failed to send reaction:", error);
				// Still works locally for demo
			}

			console.log(
				"Reaction:",
				type,
				"Rapid:",
				isRapidClick,
				"Session:",
				sessionCode
			);
		},
		[clickTimestamps, sessionCode, isConnected, sendMessage]
	);

	const handleSubmitQuestion = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!question.trim()) return;

		setIsSubmitting(true);
		try {
			// Send question to backend API
			await createQuestion(sessionCode || "", question.trim());

			// Add to local list for immediate feedback
			const newQuestion: SentQuestion = {
				id: Date.now().toString(),
				text: question.trim(),
				timestamp: Date.now(),
			};
			setSentQuestions((prev) => [newQuestion, ...prev]);
			setQuestion("");
		} catch (error) {
			console.error("Failed to send question:", error);
			// Still add locally for demo/offline mode
			const newQuestion: SentQuestion = {
				id: Date.now().toString(),
				text: question.trim(),
				timestamp: Date.now(),
			};
			setSentQuestions((prev) => [newQuestion, ...prev]);
			setQuestion("");
		} finally {
			setIsSubmitting(false);
		}
	};

	const formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("ko-KR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get questions to display (last 3 by default)
	const displayedQuestions = sentQuestions.slice(0, 3);
	const remainingCount = sentQuestions.length - 3;

	// Onboarding Screen
	if (showOnboarding) {
		return (
			<div
				className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center cursor-pointer select-none"
				onClick={handleDismissOnboarding}
			>
				<div className="text-center px-8 animate-fade-in">
					<div className="text-6xl mb-8">👋</div>
					<h1 className="text-2xl font-bold text-white mb-4">
						익명으로 참여하세요
					</h1>
					<p className="text-gray-400 mb-8 leading-relaxed">
						발표자에게 실시간으로
						<br />
						반응을 보낼 수 있어요
					</p>
					<p className="text-gray-500 text-sm animate-pulse">
						화면을 탭하여 시작
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Particle Effects - Using CSS custom properties for end position */}
			{particles.map((particle) => (
				<div
					key={particle.id}
					className="fixed pointer-events-none z-50 particle-burst"
					style={
						{
							left: particle.x,
							top: particle.y,
							"--end-x": `${particle.endX - particle.x}px`,
							"--end-y": `${particle.endY - particle.y}px`,
						} as React.CSSProperties
					}
				>
					<div
						className="rounded-full"
						style={{
							backgroundColor: particle.color,
							width: particle.size,
							height: particle.size,
							boxShadow: `0 0 ${particle.size}px ${particle.color}`,
						}}
					/>
				</div>
			))}

			{/* Header */}
			<header className="p-4 border-b border-border">
				<p className="text-center text-sm text-muted-foreground">
					익명으로 참여 중 • 세션 {sessionCode}
				</p>
			</header>

			{/* Main Content */}
			<main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
				{/* Rapid Click Feedback Toast */}
				{lastClickFeedback && (
					<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg animate-bounce z-40">
						{lastClickFeedback}
					</div>
				)}

				{/* Reaction Buttons - Per spec labels */}
				<div className="flex gap-6">
					<ReactionButton
						type="confused"
						label="다시 설명해주세요"
						emoji="🤔"
						onClick={(e) => handleReaction("confused", e)}
					/>
					<ReactionButton
						type="more"
						label="더 듣고 싶어요"
						emoji="👀"
						onClick={(e) => handleReaction("more", e)}
					/>
				</div>

				{/* Click counter hint */}
				{clickTimestamps.length > 0 && clickTimestamps.length < 5 && (
					<p className="text-xs text-muted-foreground">
						연속 {clickTimestamps.length}회 (5회 시 강하게 전달)
					</p>
				)}
			</main>

			{/* Sent Questions List - Show last 3 with "N개 더 보기" */}
			{sentQuestions.length > 0 && (
				<div className="px-4 pb-2">
					<p className="text-xs text-muted-foreground mb-2">내가 보낸 질문</p>
					<div className="space-y-2">
						{displayedQuestions.map((q) => (
							<div
								key={q.id}
								className="text-sm p-3 bg-secondary rounded-lg flex justify-between items-start"
							>
								<span className="flex-1">{q.text}</span>
								<span className="text-xs text-muted-foreground ml-2 shrink-0">
									{formatTime(q.timestamp)}
								</span>
							</div>
						))}
					</div>
					{remainingCount > 0 && (
						<button
							onClick={() => setShowAllQuestions(true)}
							className="mt-2 text-sm text-primary hover:underline w-full text-center py-2"
						>
							{remainingCount}개 더 보기
						</button>
					)}
				</div>
			)}

			{/* Question Input - Fixed at bottom */}
			<footer className="sticky bottom-0 p-4 border-t border-border bg-background">
				<Card className="p-4">
					<form onSubmit={handleSubmitQuestion} className="flex gap-2">
						<Input
							type="text"
							placeholder="질문을 입력하세요..."
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							className="flex-1"
						/>
						<Button type="submit" disabled={isSubmitting || !question.trim()}>
							전송
						</Button>
					</form>
				</Card>
			</footer>

			{/* All Questions Modal */}
			{showAllQuestions && (
				<div
					className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
					onClick={() => setShowAllQuestions(false)}
				>
					<div
						className="bg-background w-full max-w-lg max-h-[80vh] rounded-t-2xl overflow-hidden animate-slide-up"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-4 border-b border-border flex justify-between items-center">
							<h2 className="font-semibold">
								내가 보낸 질문 ({sentQuestions.length})
							</h2>
							<button
								onClick={() => setShowAllQuestions(false)}
								className="text-muted-foreground hover:text-foreground p-2"
							>
								✕
							</button>
						</div>
						<div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
							{sentQuestions.map((q) => (
								<div
									key={q.id}
									className="text-sm p-3 bg-secondary rounded-lg flex justify-between items-start"
								>
									<span className="flex-1">{q.text}</span>
									<span className="text-xs text-muted-foreground ml-2 shrink-0">
										{formatTime(q.timestamp)}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
