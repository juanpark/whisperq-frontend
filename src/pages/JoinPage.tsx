import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';

export function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    // Allow only alphanumeric characters (letters and numbers)
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitized.length > 1) return;

    const newCode = [...code];
    newCode[index] = sanitized.toUpperCase();
    setCode(newCode);

    // Auto-focus next input
    if (sanitized && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleJoin = async () => {
    const sessionCode = code.join('');
    if (sessionCode.length !== 6) {
      setError('6자리 코드를 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Verify session code with API
      // For now, just navigate
      navigate(`/s/${sessionCode}`);
    } catch {
      setError('유효하지 않은 코드입니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('이메일과 비밀번호를 입력해주세요');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      // TODO: Call actual login API
      // For now, simulate login and redirect to admin
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock: any login succeeds and goes to admin with BlPYn3 session
      setIsLoginOpen(false);
      navigate('/admin/BlPYn3');
    } catch {
      setLoginError('로그인에 실패했습니다');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignUp = () => {
    // TODO: Implement sign up page
    alert('회원가입 기능은 준비 중입니다');
  };

  const fullCode = code.join('');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <h1 className="text-3xl font-bold mb-2">whisper-Q</h1>
      <p className="text-muted-foreground mb-8">
        타인의 시선으로부터 자유로운 소통
      </p>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">세션 참여하기</CardTitle>
        </CardHeader>
        <CardContent>
          {/* QR Code Scanner Placeholder */}
          <div className="mb-6">
            <div className="w-full h-48 bg-secondary rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center text-muted-foreground">
                <p className="text-4xl mb-2">📷</p>
                <p>QR 코드 스캔</p>
                <p className="text-sm">(준비 중)</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Code Input */}
          <div className="mb-4">
            <p className="text-sm text-center mb-3">6자리 코드 입력</p>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-mono"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive text-center mb-4">{error}</p>
          )}

          {/* Join Button */}
          <Button
            onClick={handleJoin}
            disabled={isLoading || fullCode.length !== 6}
            className="w-full"
            size="lg"
          >
            {isLoading ? '확인 중...' : '참여하기'}
          </Button>

          {/* Auth Links */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex justify-center gap-4 text-sm">
              <button
                onClick={handleSignUp}
                className="text-muted-foreground hover:text-foreground underline"
              >
                회원가입
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="text-muted-foreground hover:text-foreground underline"
              >
                로그인
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogClose onClose={() => setIsLoginOpen(false)} />
        <DialogHeader>
          <DialogTitle>로그인</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">이메일</label>
              <Input
                type="email"
                placeholder="이메일을 입력하세요"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">비밀번호</label>
              <Input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full"
            >
              {isLoggingIn ? '로그인 중...' : '로그인'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              계정이 없으신가요?{' '}
              <button
                onClick={() => {
                  setIsLoginOpen(false);
                  handleSignUp();
                }}
                className="underline hover:text-foreground"
              >
                회원가입
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
