"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    kakao?: any;
  }
}

type Marker = { lat: number; lng: number; address: string; count: number };
type RankRow = { rank: number; address: string; count: number };

// 서구 가정1·2·3동/석남동/청라동/신현원창동/심곡동/연희동 + 계양구 효성동/부평구 청천동
// 일대가 기본으로 보이도록 지정한 중심좌표(인천 서구청 인근) - 요청이 이 범위 밖이어도 막지 않고 다 표시함
const DEFAULT_CENTER = { lat: 37.5457, lng: 126.6767 };
const DEFAULT_LEVEL = 7;

function radiusForCount(count: number): number {
  if (count >= 30) return 34;
  if (count >= 20) return 28;
  if (count >= 10) return 22;
  if (count >= 5) return 18;
  return 14;
}

export default function ZoneRequestMapClient({
  markers,
  ranking,
  totalCount,
  thisMonthCount,
  noCoordCount,
}: {
  markers: Marker[];
  ranking: RankRow[];
  totalCount: number;
  thisMonthCount: number;
  noCoordCount: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // 지도(Maps) 무료 쿼터는 계정당 처음 활성화한 앱 1개에만 주어져서, 과금을 피하려고
  // 이미 Maps가 활성화된 다른 앱(오더모아)의 JS키를 지도 로딩 전용으로 따로 씀
  // (로그인/공유/주소검색 등 나머지 기능은 여전히 에그팜 전용 앱의 NEXT_PUBLIC_KAKAO_JS_KEY를 씀)
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_MAPS_JS_KEY;

  useEffect(() => {
    function draw() {
      if (!window.kakao?.maps || !mapRef.current) return;
      window.kakao.maps.load(() => {
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: DEFAULT_LEVEL,
        });

        markers.forEach((m) => {
          const size = radiusForCount(m.count) * 2;
          const el = document.createElement("div");
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = "50%";
          el.style.background = "#D9791B";
          el.style.border = "3px solid #fff";
          el.style.boxShadow = "0 4px 10px rgba(217,121,27,0.35)";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.color = "#fff";
          el.style.fontWeight = "800";
          el.style.fontSize = m.count >= 10 ? "15px" : "12px";
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

    if (window.kakao?.maps) draw();
    else {
      const timer = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(timer);
          draw();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [markers]);

  return (
    <div className="px-5">
      {jsKey && (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`}
          strategy="afterInteractive"
        />
      )}

      <div className="mb-4 flex gap-2">
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center">
          <p className="text-[11px] text-neutral-400">누적 요청</p>
          <p className="text-lg font-bold text-neutral-900">{totalCount}건</p>
        </div>
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-center">
          <p className="text-[11px] text-neutral-400">이번 달</p>
          <p className="text-lg font-bold text-primary">+{thisMonthCount}건</p>
        </div>
      </div>

      {!jsKey && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          NEXT_PUBLIC_KAKAO_MAPS_JS_KEY가 설정되지 않아 지도를 표시할 수 없어요. Maps가 활성화된 카카오
          앱의 JS 키를 이 환경변수로 등록하고, 그 앱의 플랫폼에 이 도메인을 등록해주세요.
        </p>
      )}

      <div
        ref={mapRef}
        className="mb-4 h-[320px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
      />

      <div className="mb-2 flex items-center gap-2 text-[11px] text-neutral-400">
        <span className="h-3 w-3 rounded-full bg-primary" /> 원 크기·숫자 = 해당 단지 요청 건수
      </div>

      {noCoordCount > 0 && (
        <p className="mb-4 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          좌표를 찾지 못한 요청 {noCoordCount}건은 지도에 표시되지 않았어요.
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-xs text-neutral-500">요청 많은 지역 TOP 5</p>
        {ranking.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">아직 요청이 없어요</p>
        ) : (
          ranking.map((row) => (
            <div
              key={row.rank}
              className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 text-xs text-neutral-400">{row.rank}</span>
                <span className="text-sm font-medium text-neutral-900">{row.address}</span>
              </div>
              <span className="text-sm font-bold text-primary">{row.count}건</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
