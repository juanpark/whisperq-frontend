import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useReactionStore } from '@/stores/reactionStore';
import { useWebSocket } from '@/hooks/useWebSocket';

export function AdminPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { recentReactions } = useReactionStore();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<string>('00:00:00');
  const [peakConfused, setPeakConfused] = useState(0);
  const [peakMore, setPeakMore] = useState(0);
  const [isEndingSession, setIsEndingSession] = useState(false);

  // Connect to WebSocket for real-time updates
  const { isConnected, connectionError } = useWebSocket({
    sessionId: sessionId || '',
    onConnect: () => console.log('Admin connected to session:', sessionId),
    onError: (err) => console.error('Admin WebSocket error:', err),
  });

  // Track peak values
  useEffect(() => {
    setPeakConfused(prev => Math.max(prev, recentReactions.confused));
    setPeakMore(prev => Math.max(prev, recentReactions.more));
  }, [recentReactions.confused, recentReactions.more]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update duration when session is running
  useEffect(() => {
    if (!sessionStartTime || sessionEndTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - sessionStartTime.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, sessionEndTime]);

  const handleStartSession = () => {
    setSessionStartTime(new Date());
    setSessionEndTime(null);
    setDuration('00:00:00');
    setPeakConfused(0);
    setPeakMore(0);
  };

  const handleEndSession = () => {
    if (!sessionStartTime) return;
    if (!confirm('세션을 종료하시겠습니까?')) {
      return;
    }
    setSessionEndTime(new Date());
    // TODO: Call backend API to end session
    console.log('Session ended:', sessionId);
  };

  const handleViewReport = () => {
    navigate(`/report/${sessionId}`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const isSessionRunning = sessionStartTime && !sessionEndTime;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">세션: {sessionId}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '● 실시간 연결됨' : connectionError || '○ 연결 중...'}
            </span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">🤔 혼란 반응</p>
          <p className="text-3xl font-bold text-amber-600">{recentReactions.confused}</p>
          <p className="text-xs text-gray-400 mt-1">현재 30초간</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">👀 관심 반응</p>
          <p className="text-3xl font-bold text-blue-600">{recentReactions.more}</p>
          <p className="text-xs text-gray-400 mt-1">현재 30초간</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">📊 피크 혼란</p>
          <p className="text-3xl font-bold text-gray-800">{peakConfused}</p>
          <p className="text-xs text-gray-400 mt-1">세션 중 최고</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">📈 피크 관심</p>
          <p className="text-3xl font-bold text-gray-800">{peakMore}</p>
          <p className="text-xs text-gray-400 mt-1">세션 중 최고</p>
        </Card>
      </div>

      {/* Session Info */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">세션 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">현재 시간</p>
            <p className="text-xl font-mono font-bold">{formatTime(currentTime)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">시작 시간</p>
            <p className="text-lg">{sessionStartTime ? formatTime(sessionStartTime) : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">종료 시간</p>
            <p className="text-lg">{sessionEndTime ? formatTime(sessionEndTime) : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">진행 시간</p>
            <p className="text-xl font-mono font-bold">{duration}</p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Start Session Button */}
        {!isSessionRunning && !sessionEndTime && (
          <Button
            onClick={handleStartSession}
            variant="default"
            className="flex-1 h-16 text-lg bg-green-600 hover:bg-green-700"
          >
            ▶️ 세션 시작
          </Button>
        )}

        {/* End Session Button */}
        {isSessionRunning && (
          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="flex-1 h-16 text-lg"
          >
            🛑 세션 종료
          </Button>
        )}

        {/* View Report Button (after session ended) */}
        {sessionEndTime && (
          <Button
            onClick={handleViewReport}
            variant="default"
            className="flex-1 h-16 text-lg"
          >
            📊 리포트 보기
          </Button>
        )}
      </div>

      {/* Quick Links */}
      <div className="mt-8 flex gap-4">
        <Button
          variant="ghost"
          onClick={() => window.open(`/dashboard/${sessionId}`, '_blank')}
          className="text-gray-600"
        >
          📺 발표자 화면 보기
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.open(`/s/${sessionId}`, '_blank')}
          className="text-gray-600"
        >
          📱 청중 화면 열기
        </Button>
      </div>
    </div>
  );
}
