import type { Campaign, CampaignStatus } from "@/lib/campaign";
import { statusLabel } from "@/lib/campaign";

type Product = {
  id: string;
  name: string;
  base_price: number;
  photo_url: string | null;
};

export default function CampaignClosedView({
  products,
  status,
  campaign,
}: {
  products: Product[];
  status: CampaignStatus;
  campaign: Campaign | null;
}) {
  const label = status === "none" ? "아직 주문을 받지 않아요" : statusLabel(status);

  return (
    <div className="px-5">
      <div className="mb-5 flex flex-col items-center gap-3 rounded-xl bg-neutral-50 py-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="에그팜" className="h-16 w-16 opacity-70" />
        {campaign?.title && status !== "none" && (
          <p className="text-sm text-neutral-400">{campaign.title}</p>
        )}
        <p className="text-base font-medium text-neutral-600">{label}</p>
        <p className="text-xs text-neutral-400">배송 가능해지면 다시 열릴 예정이에요</p>
      </div>

      {products.length > 0 && (
        <div className="border-t border-neutral-200">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-neutral-200 py-3"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="h-full w-full object-cover blur-sm"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-neutral-400">{p.name}</p>
                <p className="text-xs text-neutral-300">
                  {p.base_price.toLocaleString()}원/판
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
