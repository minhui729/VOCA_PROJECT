// frontend/src/contexts/AuthContext.tsx
'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (accessToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        await login(storedToken);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (accessToken: string) => {
        setIsLoading(true);
        try {
          const response = await fetch('http://127.0.0.1:8000/api/users/me/', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(accessToken);
            localStorage.setItem('accessToken', accessToken);
            
            // [수정] 사용자의 역할에 따라 다른 경로로 이동
            if (userData.role === 'teacher') {
              router.push('/teacher/dashboard');
            } else {
              router.push('/student/dashboard');
            }
          } else {
            logout();
          }
        } catch (error) {
          console.error("Failed to fetch user info", error);
          logout();
        } finally {
          setIsLoading(false);
        }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};