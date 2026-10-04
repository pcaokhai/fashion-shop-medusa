import "server-only";
import { cookies } from "next/headers";
import type { Cart, Category, DataLayer, Product, ProductQuery, Region } from "./types";

// Derived from the official Medusa Next.js starter's data layer (MIT): cart cookie + Store API calls. Logic only, not its look.
const BASE = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
const CART_COOKIE = "_medusa_cart_id";
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID ?? "reg_vn";
const TIMEOUT_MS = 5000; // CLAUDE.md rule 7

async function store<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/store${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-publishable-api-key": KEY, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Medusa ${init.method ?? "GET"} /store${path} → ${res.status}`);
  return (await res.json()) as T;
}

const CART_FIELDS = "*items,*items.variant";
const PRODUCT_FIELDS = "*variants.calculated_price,+variants.inventory_quantity,*categories,*images";

const cartId = async () => (await cookies()).get(CART_COOKIE)?.value;
const setCartId = async (id: string) => (await cookies()).set(CART_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });

async function ensureCart(): Promise<string> {
  const existing = await cartId();
  if (existing) return existing;
  const { cart } = await store<{ cart: Cart }>("/carts", { method: "POST", body: JSON.stringify({ region_id: REGION_ID }) });
  await setCartId(cart.id);
  return cart.id;
}

const fetchCart = async (id: string) => (await store<{ cart: Cart }>(`/carts/${id}?fields=${CART_FIELDS}`)).cart;

const sortParam = { newest: "-created_at", "price-asc": "variants.calculated_price", "price-desc": "-variants.calculated_price" } as const;

export const real: DataLayer = {
  async listProducts({ category, q, sort = "newest", limit = 20, offset = 0 }: ProductQuery = {}) {
    const p = new URLSearchParams({ region_id: REGION_ID, fields: PRODUCT_FIELDS, limit: String(limit), offset: String(offset), order: sortParam[sort] });
    if (q) p.set("q", q);
    if (category) {
      const { product_categories } = await store<{ product_categories: Category[] }>(`/product-categories?handle=${encodeURIComponent(category)}`);
      const id = product_categories[0]?.id;
      if (!id) return { products: [], count: 0 };
      p.append("category_id[]", id);
    }
    const { products, count } = await store<{ products: Product[]; count: number }>(`/products?${p}`);
    return { products, count };
  },
  async getProduct(handle) {
    const { products } = await store<{ products: Product[] }>(`/products?handle=${encodeURIComponent(handle)}&region_id=${REGION_ID}&fields=${PRODUCT_FIELDS}`);
    return products[0] ?? null;
  },
  async listCategories() {
    return (await store<{ product_categories: Category[] }>("/product-categories?limit=100&include_descendants_tree=true")).product_categories;
  },
  async getRegion() {
    return (await store<{ region: Region }>(`/regions/${REGION_ID}`)).region;
  },
  async getCart() {
    const id = await cartId();
    return id ? fetchCart(id) : null;
  },
  async addToCart(variantId, quantity) {
    const id = await ensureCart();
    await store(`/carts/${id}/line-items`, { method: "POST", body: JSON.stringify({ variant_id: variantId, quantity }) });
    return fetchCart(id);
  },
  async updateLine(lineId, quantity) {
    const id = await ensureCart();
    await store(`/carts/${id}/line-items/${lineId}`, { method: "POST", body: JSON.stringify({ quantity }) });
    return fetchCart(id);
  },
  async removeLine(lineId) {
    const id = await ensureCart();
    await store(`/carts/${id}/line-items/${lineId}`, { method: "DELETE" });
    return fetchCart(id);
  },
};
