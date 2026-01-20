import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useReactionStore } from '@/stores/reactionStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { getQuestions, type Question } from '@/lib/api';

interface CheckedQuestion extends Question {
  checked: boolean;
}

export function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { dominantType, recentReactions, glowActive, updateReactions, resetReactions } = useReactionStore();
  const [demoMode, setDemoMode] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questions, setQuestions] = useState<CheckedQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => {
    // Load checked IDs from localStorage on init
    const stored = localStorage.getItem(`whisperq_checked_questions_${sessionId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Connect to WebSocket for real-time updates
  const { isConnected, connectionError } = useWebSocket({
    sessionId: sessionId || '',
    onConnect: () => console.log('Dashboard connected to session:', sessionId),
    onError: (err) => console.error('Dashboard WebSocket error:', err),
  });

  // Save checked IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      `whisperq_checked_questions_${sessionId}`,
      JSON.stringify([...checkedIds])
    );
  }, [checkedIds, sessionId]);

  // Fetch questions when modal opens
  const fetchQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const data = await getQuestions();
      // Add checked property based on persisted checkedIds
      setQuestions(data.map(q => ({ ...q, checked: checkedIds.has(q.id) })));
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [checkedIds]);

  useEffect(() => {
    if (showQuestionsModal) {
      fetchQuestions();
    }
  }, [showQuestionsModal, fetchQuestions]);

  const handleToggleQuestion = (id: number) => {
    // Update local state
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, checked: !q.checked } : q))
    );
    // Update persisted checkedIds
    setCheckedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatQuestionTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  // Per spec: Orange glow rgba(255, 165, 0, 0.6), Blue glow rgba(0, 150, 255, 0.6)
  const getGlowStyle = () => {
    if (!glowActive || !dominantType) {
      return {};
    }

    const color = dominantType === 'confused'
      ? 'rgba(255, 165, 0, 0.6)'
      : 'rgba(0, 150, 255, 0.6)';

    return {
      background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
    };
  };

  // Per spec: Text messages
  const getMessage = () => {
    if (!dominantType || !glowActive) return null;

    if (dominantType === 'confused') {
      return '조금 더 풀어서 설명해주세요';
    } else {
      return '이 부분 더 깊이 다뤄주세요';
    }
  };

  const message = getMessage();

  return (
    // Per spec: Default background dark gray #2D2D2D
    <div className="min-h-screen relative overflow-hidden transition-all duration-300" style={{ backgroundColor: '#2D2D2D' }}>
      {/* Glow Effect - Full screen radial gradient with 300ms fade */}
      <div
        className="absolute inset-0 transition-all duration-300 pointer-events-none"
        style={getGlowStyle()}
      />

      {/* Main Content - Centered message (per spec: no other elements visible) */}
      <main className="min-h-screen flex flex-col items-center justify-center relative z-10">
        {message ? (
          <div className="text-center animate-fade-in">
            <p className="text-3xl font-medium text-white">
              {message}
            </p>
          </div>
        ) : null}
      </main>

      {/* Demo Controls - Only visible in demo mode */}
      {demoMode && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateReactions('confused', recentReactions.confused + 5, 100)}
            className="bg-amber-100 hover:bg-amber-200 text-gray-800"
          >
            🤔 +5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateReactions('more', recentReactions.more + 5, 100)}
            className="bg-blue-100 hover:bg-blue-200 text-gray-800"
          >
            👀 +5
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetReactions()}
            className="text-gray-800"
          >
            리셋
          </Button>
        </div>
      )}

      {/* Footer with connection status and demo toggle */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-xs text-gray-400 z-10">
        <div className="flex justify-center items-center gap-4">
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {isConnected ? '● 연결됨' : connectionError || '○ 연결 중...'}
          </span>
          <span className="text-gray-600">|</span>
          <span>🤔 {recentReactions.confused}점</span>
          <span>👀 {recentReactions.more}점</span>
          <span className="text-gray-600">|</span>
          <span>글로우: {glowActive ? 'ON' : 'OFF'}</span>
          <span className="text-gray-600">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuestionsModal(true)}
            className="text-xs text-gray-400 hover:text-white"
          >
            질문 목록
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDemoMode(!demoMode)}
            className="text-xs text-gray-400 hover:text-white"
          >
            {demoMode ? '데모 숨기기' : '데모 모드'}
          </Button>
        </div>
      </footer>

      {/* Questions Modal */}
      {showQuestionsModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setShowQuestionsModal(false)}
        >
          <div
            className="bg-[#3D3D3D] w-full max-w-2xl max-h-[80vh] rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-600 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">
                질문 목록 ({questions.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchQuestions}
                  className="text-gray-400 hover:text-white"
                  disabled={isLoadingQuestions}
                >
                  {isLoadingQuestions ? '로딩...' : '새로고침'}
                </Button>
                <button
                  onClick={() => setShowQuestionsModal(false)}
                  className="text-gray-400 hover:text-white p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {isLoadingQuestions ? (
                <div className="text-center text-gray-400 py-8">
                  질문을 불러오는 중...
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  아직 질문이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        q.checked
                          ? 'bg-gray-700/50 border-gray-600 opacity-60'
                          : 'bg-[#4D4D4D] border-gray-500 hover:border-gray-400'
                      }`}
                      onClick={() => handleToggleQuestion(q.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                            q.checked
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-400'
                          }`}
                        >
                          {q.checked && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>

                        {/* Question Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-white ${
                              q.checked ? 'line-through opacity-70' : ''
                            }`}
                          >
                            {q.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{formatQuestionTime(q.createdAt)}</span>
                            {q.writerName && (
                              <>
                                <span>•</span>
                                <span>{q.writerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-600 text-sm text-gray-400 text-center">
              질문을 클릭하여 답변 완료 표시
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
