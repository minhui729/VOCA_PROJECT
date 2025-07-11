// frontend/src/app/wordbooks/[id]/study/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Loader2, ArrowLeft, ArrowRight, Volume2, RefreshCw, Puzzle, Shuffle } from 'lucide-react';

// --- 타입 정의 ---
interface Word {
  id: number;
  text: string;
  meaning: string;
  part_of_speech: string | null;
  example_sentence: string | null;
}
interface Wordbook {
  id: number;
  title: string;
  description: string | null;
  words: Word[];
}
interface ApiError {
    detail: string;
}

// --- 메인 컴포넌트 ---
export default function StudyPage() {
  const params = useParams();
  const wordbookId = params.id as string;
  const { token, isLoading: isAuthLoading } = useAuth();

  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);

  // 단어장 데이터 불러오기
  useEffect(() => {
    const fetchWordbook = async () => {
      if (!wordbookId || !token) return;
      setIsLoading(true);
      setError('');
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_BASE_URL}/api/wordbooks/${wordbookId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.detail || '단어장 정보를 불러오는 데 실패했습니다.');
        }
        const data: Wordbook = await response.json();
        setWordbook(data);
        setShuffledWords([...data.words].sort(() => Math.random() - 0.5));
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError('알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    if (!isAuthLoading) {
        fetchWordbook();
    }
  }, [wordbookId, token, isAuthLoading]);

  // --- 핸들러 함수 ---
  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    if (currentIndex < shuffledWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setStudyFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleRestart = () => {
    setShuffledWords(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyFinished(false);
  };

  // ✨ 컴파일 오류 해결: speak 함수는 문자열만 받도록 하고, 이벤트 처리는 onClick에서 직접 합니다.
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentWord = shuffledWords[currentIndex];

  // --- 렌더링 로직 ---
  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
        <Loader2 className="animate-spin mr-2" size={48} />
        단어장 불러오는 중...
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">{error}</div>;
  }
  
  if (!wordbook || shuffledWords.length === 0) {
    return (
        <div className="text-center p-10 text-slate-400">
            학습할 단어가 없습니다.
            <Link href="/student/dashboard" className="block mt-4 text-blue-500 hover:underline">
                대시보드로 돌아가기
            </Link>
        </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .card-container { perspective: 1500px; }
        .card { position: relative; width: 100%; height: 100%; transition: transform 0.7s; transform-style: preserve-3d; }
        .card.is-flipped { transform: rotateY(180deg); }
        .card-face { 
            position: absolute; 
            width: 100%; 
            height: 100%; 
            backface-visibility: hidden; 
            -webkit-backface-visibility: hidden; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center;
            padding: 2rem;
            border-radius: 1.5rem;
            border: 1px solid;
        }
        .card-face-front { 
            background-color: #1e293b; /* slate-800 */
            border-color: #334155; /* slate-700 */
        }
        .card-face-back { 
            background-color: #0f172a; /* slate-900 */
            border-color: #1e3a8a; /* blue-900 */
            transform: rotateY(180deg); 
            align-items: flex-start;
            overflow-y: auto;
        }
      `}</style>
      <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4">
        {/* 헤더 */}
        <header className="w-full max-w-4xl flex justify-between items-center mb-4">
          <Link href={`/wordbooks/${wordbookId}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
            <ArrowLeft size={20} /> 단어장으로
          </Link>
          <div className="text-slate-300 font-bold">
            {studyFinished ? "학습 완료" : `${currentIndex + 1} / ${shuffledWords.length}`}
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="flex-grow flex flex-col items-center justify-center w-full">
          {studyFinished ? (
            // 학습 완료 화면
            <div className="text-center bg-slate-800/70 p-10 rounded-2xl shadow-lg border border-slate-700">
                <h2 className="text-4xl font-bold text-sky-400 mb-4">학습 완료!</h2>
                <p className="text-slate-300 mb-8">모든 단어를 학습했습니다. 다시 복습하거나 퀴즈에 도전해보세요.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleRestart} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition">
                        <RefreshCw size={18} /> 다시 학습하기
                    </button>
                    <Link href={`/wordbooks/${wordbookId}/quiz`} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 rounded-lg hover:bg-sky-500 transition">
                        <Puzzle size={18} /> 퀴즈 풀러 가기
                    </Link>
                </div>
            </div>
          ) : (
            // 플래시카드
            <>
              <div className="w-full max-w-lg h-80 md:h-96 mb-6 card-container" onClick={handleFlip}>
                <div className={`card ${isFlipped ? 'is-flipped' : ''}`}>
                  {/* 카드 앞면 */}
                  <div className="card-face card-face-front cursor-pointer">
                    <div className="flex items-center gap-4">
                        <h2 className="text-5xl md:text-7xl font-bold">{currentWord?.text}</h2>
                        {/* ✨ 컴파일 오류 해결: onClick 핸들러 수정 */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // 카드가 뒤집히는 것을 방지
                            speak(currentWord?.text || '');
                          }} 
                          className="text-slate-400 hover:text-sky-400 transition"
                        >
                            <Volume2 size={32} />
                        </button>
                    </div>
                  </div>
                  {/* 카드 뒷면 */}
                  <div className="card-face card-face-back cursor-pointer">
                    <p className="text-3xl md:text-4xl font-bold mb-4">{currentWord?.meaning}</p>
                    {currentWord?.part_of_speech && <p className="text-lg text-sky-300 mb-4 font-mono bg-sky-900/80 px-2 py-1 rounded inline-block">{currentWord.part_of_speech}</p>}
                    {currentWord?.example_sentence && <p className="text-lg text-slate-300 italic">"{currentWord.example_sentence}"</p>}
                  </div>
                </div>
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex justify-between w-full max-w-lg">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="px-6 py-3 bg-slate-700 rounded-lg disabled:opacity-50 flex items-center gap-2"><ArrowLeft size={18} /> 이전</button>
                <button onClick={handleRestart} className="p-3 bg-slate-700 rounded-full hover:bg-slate-600 transition"><Shuffle size={18} /></button>
                <button onClick={handleNext} className="px-6 py-3 bg-slate-700 rounded-lg flex items-center gap-2">다음 <ArrowRight size={18} /></button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
