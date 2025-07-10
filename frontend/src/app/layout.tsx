// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext"; // AuthProvider 임포트

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IVITZ-English",
  description: "스마트 단어장",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider> {/* AuthProvider로 감싸기 */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}