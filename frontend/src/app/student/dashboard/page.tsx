// frontend/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// 학생 대시보드에서 사용할 단어장 데이터의 타입 정의
interface Wordbook {
  id: number;
  title: string;
  description: string | null;
  // 학생은 모든 단어장이 선생님이 만든 '공용'이라는 것을 알기 때문에
  // is_public, owner_id 같은 필드는 굳이 받아올 필요가 없습니다.
}

export default function StudentDashboard() {
  const { user, token, logout, isLoading: isAuthLoading } = useAuth();
  
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 단어장 목록을 불러오는 함수
  useEffect(() => {
    const fetchWordbooks = async () => {
      // 로그인한 사용자만 단어장을 볼 수 있으므로, 토큰은 필수입니다.
      if (!token) {
        setIsLoading(false);
        setError("로그인 정보가 없습니다.");
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        // API 요청 시 반드시 인증 토큰을 헤더에 포함해야 합니다.
        const response = await fetch('http://127.0.0.1:8000/api/wordbooks/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('단어장 목록을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        const data: Wordbook[] = await response.json();
        setWordbooks(data);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // AuthContext가 사용자 인증 정보 로딩을 마친 후에 API를 호출합니다.
    if (!isAuthLoading) {
      fetchWordbooks();
    }
  }, [isAuthLoading, token]); // isAuthLoading 또는 token 상태가 변경될 때마다 실행

  // 인증 정보 로딩 중일 때 표시할 화면
  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-screen text-gray-500">로딩 중...</div>;
  }

  // 비로그인 사용자는 PrivateRoute에 의해 자동으로 로그인 페이지로 리다이렉트 됩니다.
  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black">
      {/* 상단 네비게이션 바 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200/50 dark:border-gray-700/50">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">나의 학습 공간</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="font-semibold">{user.username}</strong>님, 환영합니다!
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">학습 단어장</h2>
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">학습을 시작할 단어장을 선택하세요.</p>
        </div>
        
        {/* 단어장 목록 또는 상태 메시지 표시 */}
        {isLoading ? (
          <p className="text-center text-gray-500">단어장 목록을 불러오는 중...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : wordbooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {wordbooks.map((wordbook) => (
              <div key={wordbook.id} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg ring-1 ring-black/5 p-6 hover:-translate-y-1.5 transition-transform duration-300 flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{wordbook.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 min-h-[48px]">
                    {wordbook.description || '이 단어장에 대한 설명이 없습니다.'}
                  </p>
                </div>
                <div className="mt-6 text-right">
                  <Link href={`/wordbooks/${wordbook.id}`} passHref>
                    <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
                      학습 시작
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500">아직 학습할 수 있는 단어장이 없습니다.<br/>선생님이 단어장을 등록할 때까지 기다려주세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
