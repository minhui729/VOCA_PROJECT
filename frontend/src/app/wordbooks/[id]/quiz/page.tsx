// frontend/src/app/wordbooks/[id]/quiz/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, RefreshCw, ArrowRight, Loader2, BrainCircuit, BookText, LogOut } from 'lucide-react';
import { cva } from 'class-variance-authority';
import Link from 'next/link';


// --- 타입 정의 ---
interface BaseQuestion {
  type: string;
  question: string;
  answer: string;
}
interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  choices: string[];
}
interface WrittenQuestion extends BaseQuestion {
  type: 'written';
}
type QuizQuestion = MultipleChoiceQuestion | WrittenQuestion;

// ✨ Test 객체 타입을 추가합니다.
interface Test {
    id: number;
    title: string;
    wordbook_id: number;
}


// --- 각 퀴즈 유형별 컴포넌트 ---

const choiceButtonVariants = cva(
  "p-4 border rounded-lg text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:opacity-50",
  {
    variants: {
      state: {
        default: "bg-slate-700/50 hover:bg-slate-600/80 border-slate-600 text-slate-100",
        selected: "bg-sky-500/40 border-sky-400 text-white ring-2 ring-sky-400",
        correct: "bg-green-500/30 border-green-400 text-white",
        incorrect: "bg-red-500/30 border-red-400 text-white",
        disabled: "bg-slate-700/50 border-slate-600 text-slate-300"
      }
    },
    defaultVariants: {
      state: "default"
    }
  }
);

const MultipleChoiceComponent = ({ question, onSubmit, isParentSubmitted }: { question: MultipleChoiceQuestion; onSubmit: (isCorrect: boolean) => void; isParentSubmitted: boolean; }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAnswer(null);
  }, [question]);

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    onSubmit(selectedAnswer === question.answer);
  };

  const getButtonState = (choice: string) => {
    if (isParentSubmitted) {
      if (choice === question.answer) return 'correct';
      if (choice === selectedAnswer) return 'incorrect';
      return 'disabled';
    }
    if (choice === selectedAnswer) return 'selected';
    return 'default';
  };

  return (
    <div className="text-center w-full">
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-8">{question.question}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
        {question.choices.map((choice, index) => (
          <button
            key={index}
            onClick={() => !isParentSubmitted && setSelectedAnswer(choice)}
            disabled={isParentSubmitted}
            className={choiceButtonVariants({ state: getButtonState(choice) })}
          >
            {choice}
          </button>
        ))}
      </div>
      {!isParentSubmitted && (
        <div className="mt-8 flex justify-center">
          <button onClick={handleSubmit} disabled={!selectedAnswer} className="w-full max-w-xs bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-colors duration-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
            확인
          </button>
        </div>
      )}
    </div>
  );
};

const WrittenComponent = ({ question, onSubmit, isParentSubmitted }: { question: WrittenQuestion; onSubmit: (isCorrect: boolean) => void; isParentSubmitted: boolean; }) => {
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    setUserAnswer('');
  }, [question]);

  const [mainQuestion, keyword] = useMemo(() => {
    const match = question.question.match(/(.*?)['‘](.*?)['’]/);
    return match ? [match[1].trim(), match[2].trim()] : [question.question, ''];
  }, [question.question]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    onSubmit(userAnswer.trim().toLowerCase() === question.answer.toLowerCase());
  };

  return (
    <div className="text-center w-full flex flex-col items-center">
      <h3 className="text-2xl md:text-3xl font-semibold text-slate-300 mb-4">{mainQuestion}</h3>
      {keyword && (
        <div className="my-6 p-4 bg-slate-700/50 rounded-lg inline-block">
          <p className="text-4xl font-bold text-white">{keyword}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 w-full max-w-md">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="정답을 입력하세요"
          disabled={isParentSubmitted}
          className="w-full text-center text-2xl p-4 bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition disabled:bg-slate-800"
          autoFocus
        />
        {!isParentSubmitted && (
          <button type="submit" disabled={!userAnswer.trim()} className="mt-6 w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-colors duration-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed">
            확인
          </button>
        )}
      </form>
    </div>
  );
};

const QuizFeedback = ({
  isCorrect,
  correctAnswer,
  onNext,
  isLastQuestion
}: {
  isCorrect: boolean | null;
  correctAnswer: string;
  onNext: () => void;
  isLastQuestion: boolean;
}) => {
  if (isCorrect === null) return null;

  const isAnswerCorrect = isCorrect === true;

  return (
    <div className="mt-8 w-full flex flex-col items-center gap-4">
      <div className={`w-full max-w-md p-3 rounded-lg flex items-center justify-center gap-3 text-lg font-bold
        ${isAnswerCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
        {isAnswerCorrect ? <CheckCircle size={24} /> : <XCircle size={24} />}
        <div>
          {isAnswerCorrect ? '정답입니다!' : '오답입니다. 정답: '}
          {!isAnswerCorrect && <span className="font-bold text-white">{correctAnswer}</span>}
        </div>
      </div>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 bg-slate-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-600 transition-colors duration-300 transform hover:scale-105"
      >
        {isLastQuestion ? '결과 보기' : '다음 문제'}
        <ArrowRight size={20} />
      </button>
    </div>
  );
};

// --- 메인 퀴즈 페이지 ---

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const wordbookId = params.id as string;
  const { token, isLoading: isAuthLoading } = useAuth();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // ✨ 시험 기록을 위한 상태 추가
  const [testId, setTestId] = useState<number | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);


  // 퀴즈 시작 시 문제 로딩 및 Test 기록 생성
  useEffect(() => {
    if (isAuthLoading || !token || !wordbookId) return;

    const startQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        
        // 1. 퀴즈를 시작하며 'Test' 기록 생성
        const testResponse = await fetch(`${API_BASE_URL}/api/wordbooks/${wordbookId}/tests`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!testResponse.ok) throw new Error('시험 기록 생성에 실패했습니다.');
        const testData: Test = await testResponse.json();
        setTestId(testData.id); // 생성된 시험 ID 저장

        // 2. 퀴즈 문제 가져오기
        const quizResponse = await fetch(`${API_BASE_URL}/api/wordbooks/${wordbookId}/quiz`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!quizResponse.ok) throw new Error('퀴즈를 불러오는 데 실패했습니다.');
        const quizData: QuizQuestion[] = await quizResponse.json();
        if (quizData.length === 0) throw new Error('생성된 퀴즈가 없습니다. 단어장에 단어를 추가해주세요.');

        setQuestions(quizData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    startQuiz();
  }, [wordbookId, token, isAuthLoading]);

  // 퀴즈 종료 시 점수 자동 제출
  useEffect(() => {
    if (!quizFinished || !testId) return;

    const submitScore = async () => {
        setIsSubmittingScore(true);
        setSubmissionError(null);
        const finalScore = questions.length > 0 ? (score / questions.length) * 100 : 0;

        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API_BASE_URL}/api/tests/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    score: finalScore,
                    test_id: testId
                })
            });
            if (!response.ok) {
                throw new Error('점수 기록에 실패했습니다.');
            }
        } catch (err: any) {
            setSubmissionError(err.message);
        } finally {
            setIsSubmittingScore(false);
        }
    };

    submitScore();
  }, [quizFinished, testId, score, questions.length, token]);


  const handleSubmitAnswer = (isCorrect: boolean) => {
    setIsSubmitted(true);
    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsSubmitted(false);
      setLastAnswerCorrect(null);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    // 다시 시작할 때도 API를 다시 호출하여 새로운 Test 기록과 문제 세트를 받음
    window.location.reload();
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-300">
      <Loader2 className="w-12 h-12 animate-spin text-sky-500" />
      <p className="mt-4 text-xl">퀴즈를 생성하는 중입니다...</p>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-900/20 text-red-300 p-4 text-center">
      <XCircle className="w-16 h-16" />
      <h1 className="mt-4 text-2xl font-bold">오류 발생</h1>
      <p className="mt-2 text-lg">{error}</p>
    </div>
  );

  const renderQuizFinished = () => {
    const finalScore = questions.length > 0 ? (score / questions.length) * 100 : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md p-8 text-center bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl shadow-sky-900/20">
          <h1 className="text-3xl font-bold text-white mb-2">퀴즈 완료!</h1>
          <p className="text-lg text-slate-300 mb-6">고생하셨습니다.</p>
          
          {isSubmittingScore ? (
             <div className="flex flex-col items-center justify-center my-8">
                <Loader2 className="animate-spin text-sky-400" size={32} />
                <p className="mt-3 text-sky-300">점수를 기록하는 중...</p>
             </div>
          ) : submissionError ? (
            <div className="my-4 text-red-400 bg-red-900/30 p-3 rounded-lg">
                <p>점수 기록 실패: {submissionError}</p>
            </div>
          ) : (
            <div className="mb-8">
                <p className="text-xl font-medium text-slate-200">최종 점수</p>
                <div className="flex items-baseline justify-center mt-2">
                <p className={`text-7xl font-bold ${finalScore >= 80 ? 'text-sky-400' : 'text-amber-400'}`}>
                    {finalScore.toFixed(0)}
                </p>
                <span className="text-4xl text-slate-400 font-bold">점</span>
                </div>
                <p className="text-slate-400 mt-2">
                {questions.length}문제 중 {score}개를 맞혔습니다.
                </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={handleRestart}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
              >
                <RefreshCw size={20} />
                새로운 퀴즈 풀기
            </button>
            <Link href={`/student/dashboard`}
              className="w-full flex items-center justify-center gap-2 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50"
              >
                <BookText size={20} />
                대시보드로 돌아가기 
            </Link>
          </div>
        </div>
      </div>
    );
  };
  
  const renderExitModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 w-full max-w-sm m-4 text-center">
            <h3 className="text-xl font-bold text-white">퀴즈 나가기</h3>
            <p className="mt-4 text-slate-300">퀴즈를 중단하고 나가시겠습니까?<br/>현재 진행 상황은 저장되지 않습니다.</p>
            <div className="mt-8 flex justify-center gap-4">
                <button onClick={() => setIsExitModalOpen(false)} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 transition-colors">
                    계속 풀기
                </button>
                <button onClick={() => router.push('/student/dashboard')} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors">
                    나가기
                </button>
            </div>
        </div>
    </div>
  );

  const renderQuestionComponent = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null; // 데이터가 아직 없을 때를 대비
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return <MultipleChoiceComponent question={currentQuestion} onSubmit={handleSubmitAnswer} isParentSubmitted={isSubmitted} />;
      case 'written':
        return <WrittenComponent question={currentQuestion} onSubmit={handleSubmitAnswer} isParentSubmitted={isSubmitted} />;
      default:
        return <p className="text-red-400">알 수 없는 퀴즈 유형입니다.</p>;
    }
  };

  if (loading || isAuthLoading) return renderLoading();
  if (error) return renderError();
  if (questions.length === 0 && !loading) return <div className="text-center p-10 text-slate-400">퀴즈를 위한 단어가 부족합니다.</div>;
  if (quizFinished) return renderQuizFinished();
  
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 selection:bg-sky-300/30">
        <div className="absolute top-4 right-4">
            <button onClick={() => setIsExitModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700/80 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                <LogOut size={16} />
                나가기
            </button>
        </div>

        {isExitModalOpen && renderExitModal()}

      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm font-medium text-slate-300">
            <span>진행도</span>
            <span>문제 {currentQuestionIndex + 1} / {questions.length}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="w-full p-6 md:p-10 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl shadow-sky-900/20 min-h-[400px] flex items-center justify-center">
                {renderQuestionComponent()}
            </div>

            {isSubmitted && (
                <QuizFeedback
                    isCorrect={lastAnswerCorrect}
                    correctAnswer={currentQuestion.answer}
                    onNext={handleNextQuestion}
                    isLastQuestion={currentQuestionIndex === questions.length - 1}
                />
            )}
        </div>
      </div>
    </div>
  );
}
