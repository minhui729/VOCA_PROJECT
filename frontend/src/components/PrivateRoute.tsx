// frontend/src/components/PrivateRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// [수정] 어떤 역할을 허용할지 `allowedRole` 속성을 받도록 변경
const PrivateRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'teacher' | 'student' }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 인증 정보 로딩이 끝났는지 확인
    if (isLoading) {
      return;
    }

    // 유저 정보가 없거나, 허용된 역할이 아니면 로그인 페이지로 리다이렉트
    if (!user || user.role !== allowedRole) {
      router.push('/login');
    }
  }, [user, isLoading, router, allowedRole]);

  // 로딩 중이거나, 역할이 맞지 않아 리다이렉트 되기 전
  if (isLoading || !user || user.role !== allowedRole) {
    return <div className="flex justify-center items-center h-screen">권한을 확인 중입니다...</div>;
  }

  // 모든 검사를 통과한 경우, 페이지를 보여줌
  return <>{children}</>;
};

export default PrivateRoute;