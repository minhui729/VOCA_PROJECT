// frontend/src/app/wordbooks/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Volume2, Info, ArrowLeft, Loader2 } from 'lucide-react';

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
// ✨ PageProps 인터페이스를 사용하는 대신, 컴포넌트 매개변수에서 직접 타입을 정의하여 빌드 오류를 해결합니다.
export default function WordbookDetailPage({ params }: { params: { id: string } }) {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPartInfo, setShowPartInfo] = useState(false);

  // 품사 약어 매핑
  const partOfSpeechAbbr: { [key: string]: string } = {
    'noun': 'n.',
    'verb': 'v.',
    'adverb': 'adv.',
    'adjective': 'adj.',
    'pronoun': 'pron.',
    'preposition': 'prep.',
    'conjunction': 'conj.',
    'interjection': 'interj.',
  };

  // 단어장 데이터 불러오기
  useEffect(() => {
    const fetchWordbookDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }
        const response = await fetch(`http://127.0.0.1:8000/api/wordbooks/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.detail || '단어장 정보를 불러오는 데 실패했습니다.');
        }
        const data: Wordbook = await response.json();
        setWordbook(data);
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('알 수 없는 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isAuthLoading && token) {
      fetchWordbookDetail();
    } else if (!isAuthLoading && !token) {
      setError('로그인이 필요합니다. 잠시 후 로그인 페이지로 이동합니다.');
      setIsLoading(false);
    }
  }, [params.id, token, isAuthLoading]);

  // 영어 발음 듣기 함수
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn("사용하시는 브라우저는 음성 재생을 지원하지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('en-'));
    if (englishVoice) utterance.voice = englishVoice;
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // --- 렌더링 로직 ---

  if (isLoading || isAuthLoading) return (
      <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <Loader2 className="animate-spin mr-2" />
          로딩 중...
      </div>
  );

  if (error) return (
      <div className="text-center p-10 text-red-500">{error}</div>
  );

  if (!wordbook) return (
      <div className="text-center p-10">단어장 정보를 찾을 수 없습니다.</div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/student/dashboard" className="inline-flex items-center gap-2 text-blue-500 hover:underline">
            <ArrowLeft size={16} />
            대시보드로 돌아가기
          </Link>
        </div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">{wordbook.title}</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">{wordbook.description}</p>
          </div>
          <button
            onClick={() => setShowPartInfo(true)}
            className="flex items-center gap-1 text-sm px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            <Info size={14} />
            품사 약어
          </button>
        </div>

        {/* 퀴즈 시작 버튼 */}
        <div className="my-8 text-center">
          <Link href={`/wordbooks/${params.id}/quiz`}>
            <button 
              disabled={wordbook.words.length < 4} 
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              종합 퀴즈 시작하기
            </button>
          </Link>
          {wordbook.words.length < 4 && <p className="text-xs text-gray-500 mt-2">퀴즈를 보려면 단어가 4개 이상 필요합니다.</p>}
        </div>

        {/* 단어 목록 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wordbook.words.map((word) => (
            <div key={word.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{word.text}</p>
                  <button onClick={() => speak(word.text)} title="발음 듣기" className="text-gray-400 hover:text-blue-500 transition-colors">
                    <Volume2 size={20} />
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  {word.part_of_speech && (
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {partOfSpeechAbbr[word.part_of_speech.toLowerCase()] || word.part_of_speech}
                    </p>
                  )}
                  <p className="text-lg text-gray-700 dark:text-gray-300">{word.meaning}</p>
                </div>
              </div>
              {word.example_sentence && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">&quot;{word.example_sentence}&quot;</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 품사 약어 안내 모달 */}
        {showPartInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-full max-w-md">
              <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">영어 품사 약어 안내</h2>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>n.</strong> 명사 (Noun)</li>
                <li><strong>pron.</strong> 대명사 (Pronoun)</li>
                <li><strong>v.</strong> 동사 (Verb)</li>
                <li><strong>adj.</strong> 형용사 (Adjective)</li>
                <li><strong>adv.</strong> 부사 (Adverb)</li>
                <li><strong>prep.</strong> 전치사 (Preposition)</li>
                <li><strong>conj.</strong> 접속사 (Conjunction)</li>
                <li><strong>interj.</strong> 감탄사 (Interjection)</li>
              </ul>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowPartInfo(false)}
                  className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
