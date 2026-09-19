import "server-only";

export type GeocodeResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: "no_key" | "http_error" | "not_found" | "network_error"; detail?: string };

// 카카오 로컬 API(주소 검색)로 주소 -> 위경도 변환. 실패 이유를 구분해서 반환해서
// 관리자 화면에서 "왜 안 되는지" 알 수 있게 함(그냥 null만 던지면 원인 파악이 안 됨)
export async function geocodeAddressDetailed(address: string): Promise<GeocodeResult> {
  if (!address?.trim()) return { ok: false, reason: "not_found" };
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return { ok: false, reason: "no_key" };

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: { Authorization: `KakaoAK ${key}` },
        cache: "no-store",
        // 네트워크 문제로 응답이 안 올 때 무한정 기다리지 않게 타임아웃을 둠(그동안 버튼이 계속 "등록 중"으로 멈춰있는 문제 방지)
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: "http_error", detail: `${res.status} ${body}`.slice(0, 200) };
    }
    const data = await res.json();
    const doc = data.documents?.[0];
    if (doc) return { ok: true, lat: Number(doc.y), lng: Number(doc.x) };

    // 도로명주소 검색으로 못 찾은 경우(신축 단지 등 도로명 등록이 늦은 경우가 있음) -
    // 건물명/키워드 검색으로 한 번 더 시도
    return await geocodeByKeyword(address, key);
  } catch (e) {
    return { ok: false, reason: "network_error", detail: e instanceof Error ? e.message : String(e) };
  }
}

async function geocodeByKeyword(query: string, key: string): Promise<GeocodeResult> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `KakaoAK ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: "http_error", detail: `${res.status} ${body}`.slice(0, 200) };
    }
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return { ok: false, reason: "not_found" };
    return { ok: true, lat: Number(doc.y), lng: Number(doc.x) };
  } catch (e) {
    return { ok: false, reason: "network_error", detail: e instanceof Error ? e.message : String(e) };
  }
}

// 기존 호출부(성공/null만 필요한 곳) 호환용
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const result = await geocodeAddressDetailed(address);
  return result.ok ? { lat: result.lat, lng: result.lng } : null;
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
