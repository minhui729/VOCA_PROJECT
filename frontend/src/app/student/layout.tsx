// frontend/app/student/layout.tsx
import PrivateRoute from "@/components/PrivateRoute";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  // "student" 역할만 이 페이지들에 접근 가능
  return <PrivateRoute allowedRole="student">{children}</PrivateRoute>;
}