import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ReactionButton } from '@/components/ReactionButton';
import type { ReactionType } from '@/types';
import { sendReactionHttp } from '@/lib/api';

interface SentQuestion {
  id: string;
  text: string;
  timestamp: number;
}

export function AudiencePage() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentQuestions, setSentQuestions] = useState<SentQuestion[]>([]);
  const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
  const [lastClickFeedback, setLastClickFeedback] = useState<string | null>(null);

  // Clean up old timestamps (older than 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setClickTimestamps(prev => prev.filter(ts => now - ts < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReaction = useCallback(async (type: ReactionType) => {
    const now = Date.now();
    const recentClicks = clickTimestamps.filter(ts => now - ts < 5000);

    // Add current click
    const newClicks = [...recentClicks, now];
    setClickTimestamps(newClicks);

    // Determine click type (급박 클릭 = 5+ clicks in 5 seconds)
    const isRapidClick = newClicks.length >= 5;

    // Show feedback
    if (isRapidClick && newClicks.length === 5) {
      setLastClickFeedback('강하게 전달됐어요!');
      // Stronger haptic for rapid click
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setTimeout(() => setLastClickFeedback(null), 2000);
    }

    // Send to backend
    try {
      const backendType = type === 'confused' ? 'CONFUSED' : 'MORE';
      await sendReactionHttp(sessionCode || '', backendType);
    } catch (error) {
      console.error('Failed to send reaction:', error);
      // Still works locally for demo
    }

    console.log('Reaction:', type, 'Rapid:', isRapidClick, 'Session:', sessionCode);
  }, [clickTimestamps, sessionCode]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Send question to API when backend implements it
      const newQuestion: SentQuestion = {
        id: Date.now().toString(),
        text: question.trim(),
        timestamp: Date.now(),
      };
      setSentQuestions(prev => [newQuestion, ...prev]);
      setQuestion('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <p className="text-center text-sm text-muted-foreground">
          익명으로 참여 중
        </p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
        {/* Rapid Click Feedback */}
        {lastClickFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium animate-bounce">
            {lastClickFeedback}
          </div>
        )}

        {/* Reaction Buttons */}
        <div className="flex gap-6">
          <ReactionButton
            type="confused"
            label="모르겠어요"
            emoji="🤔"
            onClick={() => handleReaction('confused')}
          />
          <ReactionButton
            type="more"
            label="흥미로워요"
            emoji="✨"
            onClick={() => handleReaction('more')}
          />
        </div>

        {/* Click counter hint */}
        {clickTimestamps.length > 0 && clickTimestamps.length < 5 && (
          <p className="text-xs text-muted-foreground">
            연속 {clickTimestamps.length}회 (5회 시 강하게 전달)
          </p>
        )}
      </main>

      {/* Sent Questions List */}
      {sentQuestions.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">내가 보낸 질문</p>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {sentQuestions.map((q) => (
              <div
                key={q.id}
                className="text-sm p-2 bg-secondary rounded-lg flex justify-between items-start"
              >
                <span className="flex-1">{q.text}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {formatTime(q.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Input */}
      <footer className="p-4 border-t border-border">
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
    </div>
  );
}
