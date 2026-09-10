"use client";

import KakaoShareButton from "@/components/KakaoShareButton";

export default function CampaignShareOverlay({
  title,
  imageUrl,
  path,
}: {
  title: string;
  imageUrl: string;
  path: string;
}) {
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/50 p-1.5"
    >
      <KakaoShareButton
        title={title}
        description="에그팜에서 같이 주문해요"
        imageUrl={imageUrl}
        path={path}
        label=""
        className="text-white"
      />
    </div>
  );
}
