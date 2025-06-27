// frontend/app/teacher/layout.tsx
import PrivateRoute from "@/components/PrivateRoute";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  // "teacher" 역할만 이 페이지들에 접근 가능
  return <PrivateRoute allowedRole="teacher">{children}</PrivateRoute>;
}