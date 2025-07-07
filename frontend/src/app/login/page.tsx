// frontend/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // useAuth 훅 임포트

export default function LoginPage() {
  const [username, setUsername] = useState(''); // 학생의 접속 코드
  const [password, setPassword] = useState(''); // 학생의 비밀번호
  const [error, setError] = useState(''); // 에러 메시지
  const { login } = useAuth(); // 컨텍스트에서 login 함수 가져오기

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); // 이전 에러 메시지 초기화

    // 백엔드의 /api/token 엔드포인트는 JSON이 아닌 form-data 형식을 사용합니다.
    // 따라서 URLSearchParams를 사용해 데이터를 구성해야 합니다.
    const loginData = new URLSearchParams();
    loginData.append('username', username);
    loginData.append('password', password);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        // 컨텍스트의 login 함수를 호출!
        // 이 함수가 토큰 저장, 유저 정보 로딩을 모두 처리합니다.
        await login(data.access_token); 
        alert('로그인 성공!');
      } else {
        // 로그인 실패 시 에러 메시지 표시
        const errorData = await response.json();
        setError(errorData.detail || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setError('서버와 통신할 수 없습니다. 서버가 켜져 있는지 확인해주세요.');
      console.error(err);
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
            <button type="submit" className="w-full px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
              로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}