// 순수 타입/유틸만 모아둔 파일(server-only 아님) - 클라이언트 컴포넌트에서도 import 가능해야 해서
// DB조회 함수(zoneRequest.ts)와 분리함

export type ZoneRequestRow = {
  id: string;
  road_address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
};
