import type { Metadata, Viewport } from "next";
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" style={{ colorScheme: "light" }}>
      <body className="min-h-screen overflow-x-hidden">
        <div className="mx-auto max-w-md min-h-screen bg-white shadow-sm">
          {children}
        </div>
      </body>
    </html>
  );
}
