import "server-only";

// 카카오 로컬 API(주소 검색)로 주소 -> 위경도 변환. 실패하면 null 반환(호출부에서 처리)
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null;
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      { headers: { Authorization: `KakaoAK ${key}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return null;
    return { lat: Number(doc.y), lng: Number(doc.x) };
  } catch {
    return null;
  }
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 출발지 기준 최근접 이웃(nearest neighbor) 방식으로 방문순서 계산.
// 실제 도로가 아니라 직선거리 기준이라 정확한 최적경로는 아니고, 대략적인 순서 추천용
export function optimizeRoute<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  stops: T[]
): { stop: T; distanceFromPrevKm: number }[] {
  const remaining = [...stops];
  const ordered: { stop: T; distanceFromPrevKm: number }[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const [next] = remaining.splice(nearestIdx, 1);
    ordered.push({ stop: next, distanceFromPrevKm: nearestDist });
    current = next;
  }

  return ordered;
}

// 평균 시속 25km 가정한 대략적인 소요시간(분) - 실제 도로상황(신호/정체) 반영 안 됨
export function estimateMinutes(distanceKm: number): number {
  const AVG_SPEED_KMH = 25;
  return Math.round((distanceKm / AVG_SPEED_KMH) * 60);
}
