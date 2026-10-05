"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    kakao?: any;
  }
}

export type PublicMarker = { lat: number; lng: number; address: string; count: number };

// 관리자 요청현황 지도와 같은 중심/배율(서구 일대) - 범위 밖 요청도 막지 않고 표시
const DEFAULT_CENTER = { lat: 37.5457, lng: 126.6767 };
const DEFAULT_LEVEL = 7;

function sizeForCount(count: number): number {
  if (count >= 30) return 56;
  if (count >= 20) return 48;
  if (count >= 10) return 40;
  if (count >= 5) return 34;
  return 28;
}

export default function PublicRequestMap({ markers }: { markers: PublicMarker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // 지도는 Maps가 활성화된 앱의 JS키를 따로 씀(관리자 지도와 동일)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_MAPS_JS_KEY;

  useEffect(() => {
    if (!jsKey) return;
    function draw() {
      if (!window.kakao?.maps || !mapRef.current) return;
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: DEFAULT_LEVEL,
        });
        markers.forEach((m) => {
          const size = sizeForCount(m.count);
          const el = document.createElement("div");
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#0f6b4a;border:3px solid #fff;box-shadow:0 3px 8px rgba(15,107,74,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${m.count >= 10 ? 14 : 12}px;`;
          el.title = `${m.address} · ${m.count}건`;
          el.textContent = String(m.count);
          new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(m.lat, m.lng),
            content: el,
            map,
          });
        });
      });
    }
    if (window.kakao?.maps) {
      draw();
      return;
    }
    const timer = setInterval(() => {
      if (window.kakao?.maps) {
        clearInterval(timer);
        draw();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [markers, jsKey]);

  if (!jsKey) return null;

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`}
        strategy="afterInteractive"
      />
      <div
        ref={mapRef}
        className="mb-2 h-[240px] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
      />
      <p className="mb-3 flex items-center gap-1.5 text-[11px] text-neutral-400">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" /> 숫자 = 해당 단지에 들어온 요청 건수
      </p>
    </>
  );
}
