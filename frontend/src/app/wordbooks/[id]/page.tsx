// frontend/app/wordbooks/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

// 데이터 타입 정의 (백엔드와 일치하도록 확장)
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

// 퀴즈 질문의 형태 정의
interface QuizQuestion {
  word: Word;
  options: string[]; // [정답, 오답1, 오답2, 오답3]을 섞어서 저장
  correctAnswer: string;
}

export default function WordbookDetailPage({ params }: { params: { id: string } }) {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [wordbook, setWordbook] = useState<Wordbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 뷰 모드 ('list', 'quiz', 'result') 및 퀴즈 상태 관리
  const [viewMode, setViewMode] = useState<'list' | 'quiz' | 'result'>('list');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);

  // 품사를 약어로 변환하기 위한 객체
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

  // 단어장 상세 정보를 불러오는 함수
  useEffect(() => {
    const fetchWordbookDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (!token) throw new Error("로그인이 필요합니다.");
        const response = await fetch(`http://127.0.0.1:8000/api/wordbooks/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('단어장 정보를 불러오는 데 실패했습니다.');
        const data: Wordbook = await response.json();
        setWordbook(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isAuthLoading && token) {
      fetchWordbookDetail();
    } else if (!isAuthLoading && !token) {
        setError('로그인이 필요합니다.');
        setIsLoading(false);
    }
  }, [params.id, token, isAuthLoading]);
  
  // 퀴즈 생성 및 시작 함수
  const startQuiz = () => {
    if (!wordbook || wordbook.words.length < 4) {
      alert("퀴즈를 생성하려면 최소 4개의 단어가 필요합니다.");
      return;
    }
    const shuffledWords = [...wordbook.words].sort(() => Math.random() - 0.5);
    const questions = shuffledWords.map((correctWord) => {
      const correctAnswer = correctWord.meaning;
      const wrongAnswers = shuffledWords
        .filter(w => w.id !== correctWord.id)
        .map(w => w.meaning);
      const wrongOptions = [...wrongAnswers].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
      return { word: correctWord, options, correctAnswer };
    });
    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setViewMode('quiz');
  };

  // 답안 선택 처리 함수
  const handleAnswerSelect = (selectedOption: string) => {
    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setViewMode('result');
    }
  };
  
  // 퀴즈 점수 계산 (Memoized)
  const score = useMemo(() => {
    if (quizQuestions.length === 0) return 0;
    return userAnswers.reduce((correctCount, answer, index) => {
      if (quizQuestions[index] && answer === quizQuestions[index].correctAnswer) {
        return correctCount + 1;
      }
      return correctCount;
    }, 0);
  }, [userAnswers, quizQuestions]);

  // 발음 듣기 함수
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("사용하시는 브라우저는 음성 재생을 지원하지 않습니다.");
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

  if (isLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
  if (!wordbook) return <div className="text-center p-10">단어장 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/student/dashboard" className="text-blue-500 hover:underline">
           &larr; 대시보드로 돌아가기
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">{wordbook.title}</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">{wordbook.description}</p>
        
        {viewMode === 'list' && (
          <>
            <div className="my-8 text-center">
              <button onClick={startQuiz} disabled={wordbook.words.length < 4} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                연습 퀴즈 시작 (4지 선다형)
              </button>
              {wordbook.words.length < 4 && <p className="text-xs text-gray-500 mt-2">퀴즈를 보려면 단어가 4개 이상 필요합니다.</p>}
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {wordbook.words.map((word) => (
                <div key={word.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{word.text}</p>
                      <button onClick={() => speak(word.text)} title="발음 듣기" className="text-gray-400 hover:text-blue-500 transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5a.75.75 0 01.75.75v13.5a.75.75 0 01-1.5 0V3.25A.75.75 0 0110 2.5zM8.5 6a.75.75 0 00-1.5 0v8a.75.75 0 001.5 0V6zM13 8a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V8zM5.5 8a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0V8zM16 5.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z"></path></svg>
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2">
                      {word.part_of_speech && (
                        <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                           {partOfSpeechAbbr[word.part_of_speech.toLowerCase()] || word.part_of_speech}
                        </p>
                      )}
                      <p className="text-gray-700 dark:text-gray-300">{word.meaning}</p>
                    </div>
                  </div>
                  {word.example_sentence && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                       <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{word.example_sentence}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'quiz' && quizQuestions.length > 0 && (
          <div className="mt-10 max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500">문제 {currentQuestionIndex + 1} / {quizQuestions.length}</p>
              <p className="text-3xl font-bold my-4">{quizQuestions[currentQuestionIndex].word.text}</p>
              <p className="text-gray-600 dark:text-gray-400">다음 중 위 단어의 뜻으로 알맞은 것은?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                <button key={index} onClick={() => handleAnswerSelect(option)} className="w-full p-4 text-left bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                  {index + 1}. {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'result' && (
          <div className="mt-10 max-w-3xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold text-center">퀴즈 결과</h2>
            <div className="my-8 text-center">
              <p className="text-lg">총 <strong className="text-blue-500">{quizQuestions.length}</strong>문제 중 <strong className="text-green-500">{score}</strong>개를 맞혔습니다!</p>
              <p className="text-5xl font-bold mt-2">
                {Math.round((score / quizQuestions.length) * 100)}<span className="text-2xl text-gray-500">점</span>
              </p>
            </div>
            <div className="space-y-4">
              {quizQuestions.map((q, index) => (
                <div key={index} className={`p-4 rounded-lg ${userAnswers[index] === q.correctAnswer ? 'bg-green-50 dark:bg-green-900/50' : 'bg-red-50 dark:bg-red-900/50'}`}>
                  <p className="font-bold">{index + 1}. {q.word.text}</p>
                  <p className="text-sm">정답: {q.correctAnswer}</p>
                  <p className={`text-sm ${userAnswers[index] === q.correctAnswer ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    내 답변: {userAnswers[index]}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={startQuiz} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg">다시 풀기</button>
              <button onClick={() => setViewMode('list')} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg">단어 목록으로</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
