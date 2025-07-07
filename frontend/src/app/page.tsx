// 파일 경로: frontend/src/app/page.tsx
'use client';

import Link from 'next/link';
import { BookCheck, LogIn } from 'lucide-react';

/**
 * 이 페이지는 애플리케이션의 가장 첫 진입점, 즉 '표지' 역할을 합니다.
 * 사용자에게 앱을 소개하고 로그인 페이지로 안내합니다.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-50 to-indigo-100 dark:from-slate-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 text-center selection:bg-sky-300/30">
      
      <main className="flex flex-col items-center">
        <div className="mb-6 flex items-center gap-4 text-indigo-600 dark:text-sky-400">
          <BookCheck size={60} strokeWidth={1.5} />
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-800 dark:text-white">
            VOCA MASTER
          </h1>
        </div>

        <p className="max-w-xl mt-4 text-lg text-gray-600 dark:text-gray-300">
          당신만의 단어장을 만들고, 퀴즈를 풀며 어휘력을 마스터하세요.
          <br />
        </p>

        <div className="mt-12">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <LogIn size={20} />
            로그인하여 시작하기
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 text-sm text-gray-500 dark:text-gray-400">
        © 2024 VOCA MASTER. All Rights Reserved.
      </footer>
    </div>
  );
}
