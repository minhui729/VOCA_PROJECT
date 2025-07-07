// frontend/src/app/teacher/dashboard/page.tsx
'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, AlertCircle, Loader2, UserPlus, Trash2, KeyRound, X, BookOpen } from 'lucide-react';

// =================================================================
// 타입 정의
// =================================================================
interface ParsedWord {
  text: string;
  meaning: string;
  part_of_speech?: string;
  example_sentence?: string;
}
interface Student {
  id: number;
  username: string;
  name: string;
}
interface TestResultReport {
    score: number;
    submitted_at: string;
}
interface WordbookReport {
    id: number;
    title: string;
    average_score: number | null;
    test_results: TestResultReport[];
}
interface StudentReport {
    student_id: number;
    student_name: string;
    assigned_wordbooks_report: WordbookReport[];
}
interface ApiError {
    detail: string;
}

// =================================================================
// 학생 학습 리포트 모달 컴포넌트
// =================================================================
const StudentReportModal = ({ student, token, onClose }: { student: Student; token: string | null; onClose: () => void; }) => {
    const [report, setReport] = useState<StudentReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token || !student) return;
        
        const fetchReport = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/students/${student.id}/report`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    const errorData: ApiError = await response.json();
                    throw new Error(errorData.detail || '학습 리포트를 불러오는 데 실패했습니다.');
                }
                const data: StudentReport = await response.json();
                setReport(data);
            } catch (err) {
                console.error(err);
                if (err instanceof Error) setError(err.message);
                else setError('알 수 없는 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [student, token]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                        <span className="text-blue-600 dark:text-blue-400">{student.name}</span> 학생 리포트
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    {isLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
                    : error ? <div className="text-red-500 text-center">{error}</div>
                    : report && report.assigned_wordbooks_report.length > 0 ? (
                        <div className="space-y-6">
                            {report.assigned_wordbooks_report.map(wb => (
                                <div key={wb.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{wb.title}</h4>
                                        <span className={`text-lg font-bold ${wb.average_score && wb.average_score >= 80 ? 'text-green-500' : 'text-amber-500'}`}>
                                            평균: {wb.average_score?.toFixed(1) ?? 'N/A'}점
                                        </span>
                                    </div>
                                    {wb.test_results.length > 0 ? (
                                        <ul className="mt-4 space-y-2 text-sm">
                                            {wb.test_results.map((result, index) => (
                                                <li key={index} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                                    <span className="text-gray-600 dark:text-gray-300">{new Date(result.submitted_at).toLocaleString()}</span>
                                                    <span className="font-semibold text-gray-800 dark:text-white">{result.score.toFixed(0)}점</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="mt-3 text-sm text-gray-500">아직 응시한 퀴즈가 없습니다.</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <BookOpen className="mx-auto text-gray-400" size={48} />
                            <p className="mt-4 text-gray-500">할당된 단어장이나 학습 기록이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// =================================================================
// 학생 관리 패널 컴포넌트
// =================================================================
const StudentManagementPanel = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{success: boolean; message: string; data?: unknown} | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/teacher/students/', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        setStudents(await response.json());
      } else {
        setError('학생 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionResult(null);
    try {
        const response = await fetch('http://127.0.0.1:8000/api/users/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newStudentName, username: newStudentUsername, password: "1234", role: "student" })
        });
        const data = await response.json();
        if (response.status === 201) {
            setSubmissionResult({ success: true, message: `학생 '${data.name}'이(가) 성공적으로 등록되었습니다.`, data });
            fetchStudents();
            setNewStudentName('');
            setNewStudentUsername('');
        } else {
            setSubmissionResult({ success: false, message: `등록 실패: ${data.detail || '알 수 없는 오류'}` });
        }
    } catch (err) {
        console.error(err);
        setSubmissionResult({ success: false, message: '서버와 통신 중 오류가 발생했습니다.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSubmissionResult(null);
    setNewStudentName('');
    setNewStudentUsername('');
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete || !token) return;
    setIsDeleting(true);
    setError('');
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${studentToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            setStudentToDelete(null);
            fetchStudents();
        } else {
            const errorData: ApiError = await response.json();
            setError(errorData.detail || '학생 삭제에 실패했습니다.');
            setStudentToDelete(null);
        }
    } catch (err) {
        console.error(err);
        setError('서버 통신 중 오류가 발생했습니다.');
        setStudentToDelete(null);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!studentToReset || !token) return;
    setIsResetting(true);
    setResetResult(null);
    setError('');
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/users/${studentToReset.id}/reset-password`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            setResetResult(`'${studentToReset.name}' 학생의 비밀번호가 '1234'로 초기화되었습니다.`);
        } else {
            const errorData: ApiError = await response.json();
            setResetResult(`초기화 실패: ${errorData.detail || '알 수 없는 오류'}`);
        }
    } catch (err) {
        console.error(err);
        setResetResult('서버 통신 중 오류가 발생했습니다.');
    } finally {
        setIsResetting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-gray-800/50 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">학생 목록</h2>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"><UserPlus size={18} />신규 학생 등록</button>
      </div>
      {error && <div className="mb-4 text-red-500 p-3 bg-red-100 dark:bg-red-900/20 rounded-md">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">아이디</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {students.map(student => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onClick={() => setViewingStudent(student)} className="text-blue-600 dark:text-blue-400 hover:underline">{student.name}</button></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => setStudentToReset(student)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">비밀번호 초기화</button>
                  <button onClick={() => setStudentToDelete(student)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {viewingStudent && <StudentReportModal student={viewingStudent} token={token} onClose={() => setViewingStudent(null)} />}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">신규 학생 등록</h3>
                <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>
            {!submissionResult ? (
                <form onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                        <label htmlFor="new-student-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                        <input type="text" id="new-student-name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label htmlFor="new-student-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">아이디</label>
                        <input type="text" id="new-student-username" value={newStudentUsername} onChange={(e) => setNewStudentUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">초기 비밀번호는 &apos;1234&apos;로 설정됩니다.</p>
                    <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{isSubmitting ? <Loader2 className="animate-spin" /> : '등록하기'}</button></div>
                </form>
            ) : (
                <div className={`p-4 rounded-md ${submissionResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="flex items-center">
                        {submissionResult.success ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
                        <p className={`ml-3 text-sm font-medium ${submissionResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{submissionResult.message}</p>
                    </div>
                    <button onClick={handleCloseAddModal} className="mt-4 w-full text-center px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">닫기</button>
                </div>
            )}
          </div>
        </div>
      )}
      {studentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">학생 삭제 확인</h3>
                <p className="mt-4 text-gray-600 dark:text-gray-300">정말로 <span className="font-bold text-red-500">{studentToDelete.name} ({studentToDelete.username})</span> 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={() => setStudentToDelete(null)} disabled={isDeleting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">취소</button>
                    <button onClick={handleDeleteStudent} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2">{isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}삭제 확인</button>
                </div>
            </div>
        </div>
      )}
      {studentToReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md m-4">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">비밀번호 초기화</h3>
                {resetResult ? (
                    <div>
                        <div className="flex items-center gap-2 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                            <CheckCircle className="text-green-500" />
                            <p className="text-green-800 dark:text-green-200">{resetResult}</p>
                        </div>
                        <button onClick={() => { setStudentToReset(null); setResetResult(null); }} className="mt-6 w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">닫기</button>
                    </div>
                ) : (
                    <div>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">정말로 <span className="font-bold text-indigo-500">{studentToReset.name} ({studentToReset.username})</span> 학생의 비밀번호를 초기화하시겠습니까?</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setStudentToReset(null)} disabled={isResetting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">취소</button>
                            <button onClick={handleResetPassword} disabled={isResetting} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2">{isResetting ? <Loader2 className="animate-spin" /> : <KeyRound size={18} />}초기화</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

// --- 단어장 등록 패널 ---
const WordbookUploadPanel = () => {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [words, setWords] = useState<ParsedWord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://127.0.0.1:8000/api/teacher/students/', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            setAllStudents(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch students for wordbook upload", err);
      }
    };
    fetchStudents();
  }, [token]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessMessage('');
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: false, skipEmptyLines: true,
        complete: (result) => {
          const parsedData: ParsedWord[] = (result.data as string[][]).map(row => ({ text: row[0]?.trim(), meaning: row[1]?.trim(), part_of_speech: row[2]?.trim(), example_sentence: row[3]?.trim() })).filter(word => word.text && word.meaning);
          setWords(parsedData);
        },
        error: (err) => { setError('CSV 파일 파싱에 실패했습니다: ' + err.message); }
      });
    }
  };

  const handleStudentSelect = (studentId: number) => { setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]); };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || words.length === 0) { setError('단어가 포함된 CSV 파일을 선택해주세요.'); return; }
    if (selectedStudentIds.length === 0) { setError('단어장을 할당할 학생을 한 명 이상 선택해주세요.'); return; }
    if (!token) { setError('로그인이 필요합니다.'); return; }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/wordbooks/upload/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, description, words, student_ids: selectedStudentIds }),
      });
      if (response.status === 201) {
        setSuccessMessage(`'${title}' 단어장이 ${selectedStudentIds.length}명의 학생에게 성공적으로 할당되었습니다!`);
        setTitle(''); setDescription(''); setFile(null); setWords([]); setSelectedStudentIds([]);
        const fileInput = document.getElementById('file-upload-tab') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errorData: ApiError = await response.json();
        setError(`업로드 실패: ${errorData.detail || '알 수 없는 오류'}`);
      }
    } catch (err) {
      console.error(err);
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-gray-800/50 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title-tab" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">단어장 제목</label>
          <input id="title-tab" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 중등 필수 영단어 1200" className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition" required />
        </div>
        <div>
          <label htmlFor="description-tab" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">설명 (선택)</label>
          <textarea id="description-tab" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="이 단어장에 대한 간단한 설명을 입력하세요." className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-transparent focus:ring-2 focus:ring-blue-500 transition" />
        </div>
        <div>
          <label htmlFor="file-upload-tab" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">단어 목록 CSV 파일</label>
          <input id="file-upload-tab" type="file" onChange={handleFileChange} accept=".csv" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">파일 형식: 단어,뜻,품사,예문 (품사와 예문은 생략 가능)</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">단어장 할당 학생</label>
          {allStudents.length > 0 ? (
            <div className="max-h-48 overflow-y-auto p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg space-y-2 border border-gray-200 dark:border-gray-700">
              {allStudents.map(student => (
                <div key={student.id} className="flex items-center">
                  <input type="checkbox" id={`student-upload-${student.id}`} checked={selectedStudentIds.includes(student.id)} onChange={() => handleStudentSelect(student.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor={`student-upload-${student.id}`} className="ml-3 block text-sm text-gray-900 dark:text-gray-200">{student.name} ({student.username})</label>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">등록된 학생이 없습니다.</p>}
        </div>
        {words.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">총 <span className="font-bold">{words.length}</span>개의 단어를 <span className="font-bold">{selectedStudentIds.length}</span>명의 학생에게 할당합니다.</p>
          </div>
        )}
        <div className="pt-4"><button type="submit" disabled={isLoading || words.length === 0 || selectedStudentIds.length === 0} className="w-full flex justify-center items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all">{isLoading ? <><Loader2 className="animate-spin" /> 업로드 중...</> : '업로드하여 단어장 생성'}</button></div>
        {successMessage && <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><CheckCircle size={18} /> {successMessage}</div>}
        {error && <div className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"><AlertCircle size={18} /> {error}</div>}
      </form>
    </div>
  );
};

// --- 메인 대시보드 페이지 ---
export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'upload'>('students');

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">선생님 대시보드</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('students')} className={`${activeTab === 'students' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>학생 관리</button>
            <button onClick={() => setActiveTab('upload')} className={`${activeTab === 'upload' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>단어장 등록</button>
          </nav>
        </div>
        <div>
          {activeTab === 'students' && <StudentManagementPanel />}
          {activeTab === 'upload' && <WordbookUploadPanel />}
        </div>
      </main>
    </div>
  );
}
