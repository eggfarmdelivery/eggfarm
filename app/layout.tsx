import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "에그팜",
  description: "계란 정기배송 · 일반배송 · 발주",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

// 핀치줌/확대축소 방지 + 항상 라이트모드로 고정(다크모드 대응 미비로 인한 테두리 안보임 등 방지)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light",
  themeColor: "#E8940C",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" style={{ colorScheme: "light" }}>
      {/* 홈화면 아이콘(PWA standalone)으로 열었을 때, body 자체가 스크롤되면 iOS의
          러버밴드 바운스 때문에 하단 고정 탭바가 스크롤 중에 같이 튀는 문제가 있었음.
          body는 뷰포트에 고정시켜 안 움직이게 하고, 안쪽 div만 실제로 스크롤되게 분리해서 해결함 */}
      <body className="fixed inset-0 overflow-hidden overscroll-none">
        <div className="mx-auto h-full max-w-md overflow-y-auto overscroll-contain bg-white shadow-sm">
          {children}
        </div>
        <Script
          src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
