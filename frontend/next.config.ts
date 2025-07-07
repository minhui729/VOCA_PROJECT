import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 다른 config 옵션들이 여기에 있을 수 있습니다. */
  
  // ESLint 설정을 여기에 추가합니다.
  eslint: {
    // 경고: 이 옵션은 프로젝트에 ESLint 오류가 있어도
    // 프로덕션 빌드를 성공적으로 완료하도록 허용합니다.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;