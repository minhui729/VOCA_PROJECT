// frontend/app/page.tsx
'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import Papa from 'papaparse';
import { useAuth } from '@/contexts/AuthContext';

// CSV에서 파싱된 단어의 타입 정의
interface ParsedWord {
  text: string;
  meaning: string;
  part_of_speech?: string;
  example_sentence?: string;
}

export default function TeacherWordbookUpload() {
  const { token } = useAuth();
  
  // 폼 상태 관리
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [words, setWords] = useState<ParsedWord[]>([]);
  
  // UI 피드백을 위한 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 파일 입력창의 변경을 감지하는 함수
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessMessage('');
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Papa Parse로 CSV 파일 파싱
      Papa.parse(selectedFile, {
        complete: (result) => {
          // 파싱된 데이터: result.data (배열의 배열 형태)
          // 예: [ ['apple', '사과'], ['book', '책'] ]
          const parsedData: ParsedWord[] = result.data
            .map((row: any) => ({
              text: row[0]?.trim(),
              meaning: row[1]?.trim(),
              part_of_speech: row[2]?.trim(),
              example_sentence: row[3]?.trim(),
            }))
            .filter(word => word.text && word.meaning); // 단어와 뜻이 모두 있는 행만 필터링
          
          setWords(parsedData);
        },
        error: (err) => {
          setError('CSV 파일 파싱에 실패했습니다: ' + err.message);
        }
      });
    }
  };

  // 폼 제출 시 실행될 함수
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || words.length === 0) {
      setError('단어가 포함된 CSV 파일을 선택해주세요.');
      return;
    }
    if (!token) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/wordbooks/upload/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, words }),
      });

      if (response.status === 201) {
        setSuccessMessage(`'${title}' 단어장이 ${words.length}개의 단어와 함께 성공적으로 생성되었습니다!`);
        // 폼 초기화
        setTitle('');
        setDescription('');
        setFile(null);
        setWords([]);
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      } else {
        const errorData = await response.json();
        setError(`업로드 실패: ${errorData.detail || '알 수 없는 오류'}`);
      }
    } catch (err) {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">
            단어장 일괄 등록
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
            CSV 파일을 이용하여 대량의 단어를 한 번에 등록합니다.
          </p>
        </div>

        <div className="max-w-3xl mx-auto p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black/5">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">단어장 제목</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 중등 필수 영단어 1200" className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">설명 (선택)</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="이 단어장에 대한 간단한 설명을 입력하세요." className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label htmlFor="file-upload" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">단어 목록 CSV 파일</label>
              <input id="file-upload" type="file" onChange={handleFileChange} accept=".csv" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">파일 형식: 단어,뜻,품사,예문 (품사와 예문은 생략 가능)</p>
            </div>

            {/* 파싱된 단어 수 미리보기 */}
            {words.length > 0 && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  총 <span className="font-bold text-blue-600">{words.length}</span>개의 단어를 등록합니다.
                </p>
              </div>
            )}

            {/* 업로드 버튼 */}
            <div className="pt-4">
              <button type="submit" disabled={isLoading || words.length === 0} className="w-full px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all">
                {isLoading ? '업로드 중...' : '업로드하여 단어장 생성'}
              </button>
            </div>
            
            {/* 성공 또는 에러 메시지 */}
            {successMessage && <p className="text-sm text-green-600 text-center">{successMessage}</p>}
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}