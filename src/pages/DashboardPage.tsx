import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useReactionStore } from '@/stores/reactionStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GlowEffect } from '@/components/GlowEffect';
import { Button } from '@/components/ui/button';

export function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { intensity, dominantType, recentReactions, glowActive, updateReactions } = useReactionStore();
  const [demoMode, setDemoMode] = useState(false);

  // Connect to WebSocket for real-time updates
  const { isConnected, connectionError } = useWebSocket({
    sessionId: sessionId || '',
    onConnect: () => console.log('Dashboard connected to session:', sessionId),
    onError: (err) => console.error('Dashboard WebSocket error:', err),
  });

  // Determine which message to show (glow triggers at 5+ points)
  const getMessage = () => {
    if (!dominantType || !glowActive) return null;

    if (dominantType === 'confused') {
      return { emoji: '🤔', text: '조금 더 풀어서 설명해주세요' };
    } else {
      return { emoji: '✨', text: '이 부분 더 깊이 다뤄주세요' };
    }
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Glow Effect */}
      <GlowEffect
        intensity={intensity}
        color={dominantType === 'confused' ? 'orange' : 'blue'}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">whisper-Q</h1>
          <span className="text-sm text-muted-foreground">
            세션: {sessionId}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center justify-center">
        {message ? (
          <div className="text-center animate-pulse-glow">
            <span className="text-8xl mb-4 block">{message.emoji}</span>
            <p className="text-2xl font-medium text-foreground">
              {message.text}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-xl">청중의 반응을 기다리는 중...</p>
            <p className="text-sm mt-2">
              반응이 들어오면 화면에 표시됩니다
            </p>
          </div>
        )}
      </main>

      {/* Demo Controls (for testing glow effect) */}
      {demoMode && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateReactions('confused', recentReactions.confused + 5, Math.min(intensity + 15, 100))}
            className="bg-amber-100 hover:bg-amber-200"
          >
            🤔 +5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateReactions('more', recentReactions.more + 5, Math.min(intensity + 15, 100))}
            className="bg-blue-100 hover:bg-blue-200"
          >
            ✨ +5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateReactions('confused', 0, 0)}
          >
            리셋
          </Button>
        </div>
      )}

      {/* Footer with debug info */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-xs text-muted-foreground z-10">
        <div className="flex justify-center items-center gap-4">
          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
            {isConnected ? '연결됨' : connectionError || '연결 중...'}
          </span>
          <span>|</span>
          <span>🤔 {recentReactions.confused}점</span>
          <span>✨ {recentReactions.more}점</span>
          <span>| 글로우: {glowActive ? 'ON' : 'OFF'}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDemoMode(!demoMode)}
            className="text-xs"
          >
            {demoMode ? '데모 숨기기' : '데모 모드'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
