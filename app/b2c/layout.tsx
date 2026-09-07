import { getConfig } from "@/lib/settings";
import KakaoContactButton from "@/components/KakaoContactButton";

export default async function B2CLayout({ children }: { children: React.ReactNode }) {
  const kakaoUrl = await getConfig("kakao_openchat_url");

  return (
    <>
      {children}
      <KakaoContactButton url={kakaoUrl} />
    </>
  );
}
