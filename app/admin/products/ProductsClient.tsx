"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "./actions";
import Spinner from "@/components/Spinner";
import Badge from "@/components/Badge";
import { Plus, Egg, Check } from "lucide-react";

type Limit = {
  stock_limit: number;
  overflow_rate: number;
  per_person_limit: number | null;
} | null;

type Product = {
  id: string;
  name: string;
  base_price: number;
  photo_url: string | null;
  is_active: boolean;
  current: Limit;
};

function formatNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
}

function PriceInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [display, setDisplay] = useState(
    defaultValue !== undefined ? defaultValue.toLocaleString() : ""
  );
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => setDisplay(formatNumber(e.target.value))}
        placeholder="0"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 pr-8 text-sm"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
        원
      </span>
      {/* 실제 제출값은 콤마 뗀 순수 숫자로 */}
      <input type="hidden" name={name} value={display.replace(/,/g, "")} />
    </div>
  );
}

function CreateProductForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await createProduct(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setJustDone(true);
      router.refresh();
      setTimeout(() => {
        setJustDone(false);
        setOpen(false);
      }, 1200);
    } catch {
      setError("등록 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary py-3 text-sm font-medium text-primary"
      >
        <Plus size={16} /> 신규 상품 등록
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="relative mb-6 space-y-3 rounded-xl border border-neutral-200 p-4"
    >
      {justDone && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90">
          <p className="flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
            <Check size={15} /> 등록 완료됐어요
          </p>
        </div>
      )}

      <p className="text-sm font-medium mb-1">신규 상품 등록</p>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">사진 (선택)</label>
        <input type="file" name="photo" accept="image/*" className="text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">상품명</label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">가격(원/판)</label>
        <PriceInput name="base_price" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">기준재고</label>
          <input
            type="number"
            name="stock_limit"
            defaultValue={100}
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">초과허용(%)</label>
          <input
            type="number"
            name="overflow_rate"
            defaultValue={30}
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">인당한도</label>
          <input
            type="number"
            name="per_person_limit"
            defaultValue={2}
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          {pending ? "등록 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}

function ProductEditRow({ product }: { product: Product }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.set("product_id", product.id);
    setPending(true);
    setError(null);
    try {
      const result = await updateProduct(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setJustSaved(true);
      router.refresh();
      setTimeout(() => setJustSaved(false), 1500);
    } catch {
      setError("저장 중 알 수 없는 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      className={`mb-3 space-y-3 rounded-xl border p-4 transition-colors ${
        justSaved ? "border-green-400 bg-green-50/40" : "border-neutral-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-100">
            <Egg size={22} className="text-neutral-400" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <input
              name="name"
              defaultValue={product.name}
              className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm font-medium"
            />
            <Badge tone={product.is_active ? "green" : "gray"}>
              {product.is_active ? "판매중" : "중지"}
            </Badge>
          </div>
          <PriceInput name="base_price" defaultValue={product.base_price} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">사진 교체(선택)</label>
        <input type="file" name="photo" accept="image/*" className="text-sm" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">기준재고</label>
          <input
            type="number"
            name="stock_limit"
            defaultValue={product.current?.stock_limit ?? 100}
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">초과허용(%)</label>
          <input
            type="number"
            name="overflow_rate"
            defaultValue={
              product.current ? Math.round(product.current.overflow_rate * 100) : 30
            }
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">인당한도</label>
          <input
            type="number"
            name="per_person_limit"
            defaultValue={product.current?.per_person_limit ?? 2}
            className="w-full rounded-md border border-neutral-200 px-2 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={product.is_active} />
        판매중(끄면 주문화면에서 안 보임)
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 ${
          justSaved ? "bg-green-600" : "bg-primary"
        }`}
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : justSaved ? (
          <>
            <Check size={15} className="inline -mt-0.5" /> 저장됨
          </>
        ) : (
          "저장"
        )}
      </button>
    </form>
  );
}

export default function ProductsClient({ products }: { products: Product[] }) {
  return (
    <div className="px-5">
      <CreateProductForm />

      <p className="mb-2 text-xs text-neutral-500">등록된 상품 ({products.length})</p>
      {products.map((p) => (
        <ProductEditRow key={p.id} product={p} />
      ))}
    </div>
  );
}
