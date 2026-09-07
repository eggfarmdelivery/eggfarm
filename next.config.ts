import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 배송완료 사진(카메라 촬영본)이 기본 1MB 제한보다 커서 서버 액션이 실패하던 문제 해결
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
