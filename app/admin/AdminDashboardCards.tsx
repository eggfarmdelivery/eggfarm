"use client";

import { useState } from "react";
import {
  Users,
  ShoppingCart,
  BarChart3,
  Egg,
  AlertCircle,
  MapPin,
  Bell,
  Truck,
} from "lucide-react";

export type DashboardCard = {
  key: string;
  label: string;
  icon: "users" | "orders" | "revenue" | "campaign" | "refund" | "zones" | "kakao" | "delivery";
  value: string;
  sub?: string;
  danger?: boolean;
  muted?: boolean;
  detail?: { label: string; value: string }[];
};

const ICONS = {
  users: Users,
  orders: ShoppingCart,
  revenue: BarChart3,
  campaign: Egg,
  refund: AlertCircle,
  zones: MapPin,
  kakao: Bell,
  delivery: Truck,
};

export default function AdminDashboardCards({ cards }: { cards: DashboardCard[] }) {
  const [active, setActive] = useState<string | null>(null);
  const activeCard = cards.find((c) => c.key === active);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((card) => {
          const Icon = ICONS[card.icon];
          const isActive = active === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActive(isActive ? null : card.key)}
              className={`rounded-xl border p-3 text-left ${
                card.danger ? "border-transparent bg-red-50" : "border-neutral-200 bg-white"
              } ${isActive ? "ring-1 ring-neutral-400" : ""} ${card.muted ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs ${card.danger ? "text-red-600" : "text-neutral-500"}`}>
                  {card.label}
                </span>
                <Icon size={16} className={card.danger ? "text-red-500" : "text-neutral-400"} />
              </div>
              <p
                className={`mt-1 text-xl font-medium ${
                  card.danger ? "text-red-600" : card.muted ? "text-neutral-400 text-base" : ""
                }`}
              >
                {card.value}
              </p>
              {card.sub && (
                <p className={`mt-0.5 text-xs ${card.danger ? "text-red-500" : "text-neutral-400"}`}>
                  {card.sub}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {activeCard?.detail && activeCard.detail.length > 0 && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="mb-2 text-sm font-medium">{activeCard.label} 상세</p>
          {activeCard.detail.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-t border-neutral-200 py-1.5 first:border-t-0"
            >
              <span className="text-xs text-neutral-500">{row.label}</span>
              <span className="text-xs">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
