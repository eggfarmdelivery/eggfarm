"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct } from "./actions";
import Spinner from "@/components/Spinner";

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

function CreateProductForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await createProduct(formData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 w-full rounded-lg border border-dashed border-primary py-3 text-sm font-medium text-primary"
      >
        + 신규 상품 등록
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="mb-6 space-y-3 rounded-xl border border-neutral-200 p-4"
    >
      <p className="text-sm font-medium mb-1">신규 상품 등록</p>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">사진</label>
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
        <input
          type="number"
          name="base_price"
          required
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
        />
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
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    formData.set("product_id", product.id);
    setPending(true);
    setError(null);
    try {
      await updateProduct(formData);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했어요");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={handleSubmit}
      className="mb-3 space-y-3 rounded-xl border border-neutral-200 p-4"
    >
      <div className="flex items-center gap-3">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-lg bg-neutral-100" />
        )}
        <div className="flex-1">
          <input
            name="name"
            defaultValue={product.name}
            className="mb-1 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm font-medium"
          />
          <input
            type="number"
            name="base_price"
            defaultValue={product.base_price}
            className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm"
          />
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
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? "저장 중..." : "저장"}
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
