// frontend/src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react'; // 로딩 아이콘 추가

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
  const { login } = useAuth();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true); // 로딩 시작

    const loginData = new URLSearchParams();
    loginData.append('username', username);
    loginData.append('password', password);

    // ✨ API 주소를 환경 변수에서 가져오도록 수정
    // 배포 환경에서는 Vercel에 설정된 NEXT_PUBLIC_API_URL 값을 사용하고,
    // 로컬 개발 환경에서는 || 뒤의 기본값(http://127.0.0.1:8000)을 사용합니다.
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

    try {
      const response = await fetch(`${API_BASE_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        // AuthContext의 login 함수를 호출하여 토큰 저장 및 페이지 이동 처리
        await login(data.access_token);
        // 로그인 성공 시 alert 대신 AuthContext에서 페이지 이동을 처리하므로 별도 액션 불필요
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '로그인에 실패했습니다. 접속 코드와 비밀번호를 확인해주세요.');
      }
    } catch (err) {
      setError('서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
      console.error(err);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black/5">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">학생 로그인</h1>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">접속 코드</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="선생님께 받은 접속 코드를 입력하세요"
              className="mt-1 w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="mt-1 w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:bg-gray-400"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
