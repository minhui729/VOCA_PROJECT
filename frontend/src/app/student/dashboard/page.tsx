// frontend/src/app/student/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, BookCopy, BookMarked, Puzzle, BarChart, LineChart } from 'lucide-react';
// ✨ recharts 라이브러리에서 필요한 컴포넌트들을 import 합니다.
import { 
    ResponsiveContainer, 
    BarChart as RechartsBarChart, 
    LineChart as RechartsLineChart,
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend, 
    Bar, 
    Line,
    CartesianGrid
} from 'recharts';

// --- 타입 정의 ---
interface Wordbook {
  id: number;
  title: string;
  description: string | null;
}
interface ApiError {
    detail: string;
}
// ✨ 통계 데이터 타입을 추가합니다.
interface WordbookStat {
    wordbook_title: string;
    average_score: number;
}
interface DailyScore {
    date: string; // YYYY-MM-DD 형식
    score: number;
}
interface StudentStats {
    wordbook_stats: WordbookStat[];
    daily_scores: DailyScore[];
}

// =================================================================
// ✨ [신규] 학습 통계 차트 컴포넌트
// =================================================================
const StudentStatsDashboard = ({ token }: { token: string | null }) => {
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
                const response = await fetch(`${API_BASE_URL}/api/students/me/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('학습 통계 데이터를 불러오는 데 실패했습니다.');
                const data: StudentStats = await response.json();
                setStats(data);
            } catch (err) {
                if (err instanceof Error) setError(err.message);
                else setError('알 수 없는 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8 bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg ring-1 ring-black/5 mb-12">
                <Loader2 className="animate-spin mr-2" /> 통계 데이터를 불러오는 중...
            </div>
        );
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">{error}</div>;
    }

    if (!stats || (stats.wordbook_stats.length === 0 && stats.daily_scores.length === 0)) {
        return null; // 통계 데이터가 없으면 아무것도 표시하지 않음
    }

    return (
        <div className="mb-12 p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-lg ring-1 ring-black/5">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">나의 학습 통계</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 단어장별 숙련도 차트 */}
                <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart size={20} /> 단어장별 숙련도</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <RechartsBarChart data={stats.wordbook_stats}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="wordbook_title" tick={{ fill: '#a1a1aa' }} fontSize={12} />
                                <YAxis tick={{ fill: '#a1a1aa' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                <Legend />
                                <Bar dataKey="average_score" name="평균 점수" fill="#38bdf8" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* 성적 변화 추이 차트 */}
                <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><LineChart size={20} /> 성적 변화 추이</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <RechartsLineChart data={stats.daily_scores}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                <XAxis dataKey="date" tick={{ fill: '#a1a1aa' }} fontSize={12} />
                                <YAxis tick={{ fill: '#a1a1aa' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                <Legend />
                                <Line type="monotone" dataKey="score" name="퀴즈 점수" stroke="#818cf8" strokeWidth={2} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- 메인 대시보드 페이지 ---
export default function StudentDashboard() {
  const { user, token, logout, isLoading: isAuthLoading } = useAuth();
  
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWordbooks = async () => {
      if (!token) {
        setIsLoading(false);
        setError("로그인 정보가 없습니다.");
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_BASE_URL}/api/wordbooks/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.detail || '단어장 목록을 불러오는 데 실패했습니다.');
        }
        const data: Wordbook[] = await response.json();
        setWordbooks(data);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    if (!isAuthLoading) {
      fetchWordbooks();
    }
  }, [isAuthLoading, token]);

  if (isAuthLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
            <Loader2 className="animate-spin text-blue-500 h-12 w-12" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">사용자 정보를 확인하는 중...</p>
        </div>
    );
  }

  if (!user) {
    return null; 
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg sticky top-0 z-10 border-b border-gray-200/50 dark:border-gray-700/50">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">나의 학습 공간</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="font-semibold">{user.name}</strong>님, 환영합니다!
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
        {/* ✨ 통계 대시보드 컴포넌트 추가 */}
        <StudentStatsDashboard token={token} />

        <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">학습 단어장</h2>
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">학습을 시작할 단어장을 선택하세요.</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-10">
            <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
            <p className="ml-4 text-center text-gray-500">단어장 목록을 불러오는 중...</p>
          </div>
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
                <div className="mt-6 flex justify-end gap-3">
                  {/* ✨ '단어 암기' 버튼의 링크를 단어장 상세 페이지로 수정합니다. */}
                  <Link href={`/wordbooks/${wordbook.id}`} passHref>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all">
                      <BookMarked size={16} />
                      단어 보기
                    </button>
                  </Link>
                  <Link href={`/wordbooks/${wordbook.id}/quiz`} passHref>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
                      <Puzzle size={16} />
                      퀴즈 풀기
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white/50 dark:bg-gray-800/50 rounded-2xl">
            <BookCopy className="mx-auto text-gray-400" size={48} />
            <p className="mt-4 text-gray-500">아직 학습할 수 있는 단어장이 없습니다.<br/>선생님이 단어장을 등록할 때까지 기다려주세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
