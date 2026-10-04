import "server-only";
import { cookies } from "next/headers";
import { applyQuery, type Cart, type Category, type DataLayer, type Product, type ProductQuery, type Region } from "./types";

// Derived from the official Medusa Next.js starter's data layer (MIT): cart cookie + Store API calls. Logic only, not its look.
const BASE = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
export const CART_COOKIE = "_medusa_cart_id";
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID ?? "reg_vn";
const TIMEOUT_MS = 5000; // CLAUDE.md rule 7

export async function store<T>(path: string, init: RequestInit = {}): Promise<T> {
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
const PRODUCT_FIELDS = "*variants.calculated_price,+variants.inventory_quantity,*categories,*images,+metadata";

export const cartId = async () => (await cookies()).get(CART_COOKIE)?.value;
const setCartId = async (id: string) => (await cookies()).set(CART_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });

async function ensureCart(): Promise<string> {
  const existing = await cartId();
  if (existing) return existing;
  const { cart } = await store<{ cart: Cart }>("/carts", { method: "POST", body: JSON.stringify({ region_id: REGION_ID }) });
  await setCartId(cart.id);
  return cart.id;
}

export const fetchCart = async (id: string) => (await store<{ cart: Cart }>(`/carts/${id}?fields=${CART_FIELDS}`)).cart;

const PAGE = 100;
const CATALOGUE_TTL_MS = 30_000;
const catalogue = new Map<string, { at: number; products: Promise<Product[]> }>();

async function categoryId(handle: string): Promise<string | undefined> {
  const { product_categories } = await store<{ product_categories: Category[] }>(`/product-categories?handle=${encodeURIComponent(handle)}`);
  return product_categories[0]?.id;
}

/** Every product of a category (or the whole store), paged server-side and cached for 30 s. ponytail: fine to ~1000 products; B2 (Meilisearch /store/search) replaces it. */
function loadAll(catId?: string): Promise<Product[]> {
  const key = catId ?? "all";
  const hit = catalogue.get(key);
  if (hit && Date.now() - hit.at < CATALOGUE_TTL_MS) return hit.products;
  const products = (async () => {
    const out: Product[] = [];
    for (let offset = 0; ; offset += PAGE) {
      const p = new URLSearchParams({ region_id: REGION_ID, fields: PRODUCT_FIELDS, limit: String(PAGE), offset: String(offset), order: "-created_at" });
      if (catId) p.append("category_id[]", catId);
      const page = await store<{ products: Product[]; count: number }>(`/products?${p}`);
      out.push(...page.products);
      if (out.length >= page.count || page.products.length === 0) return out;
    }
  })();
  products.catch(() => catalogue.delete(key));
  catalogue.set(key, { at: Date.now(), products });
  return products;
}

export const real: DataLayer = {
  async listProducts(query: ProductQuery = {}) {
    const { category, sort = "newest" } = query;
    let catId: string | undefined;
    if (category) {
      catId = await categoryId(category);
      if (!catId) return { products: [], count: 0 };
    }
    // Medusa pages natively only for plain newest-first browsing; search, filters and price sort run over the full list.
    const plain = !query.q && !query.onSale && !query.inStock && query.maxPrice === undefined && sort === "newest";
    if (!plain) return applyQuery(await loadAll(catId), query);
    const p = new URLSearchParams({ region_id: REGION_ID, fields: PRODUCT_FIELDS, limit: String(query.limit ?? 20), offset: String(query.offset ?? 0), order: "-created_at" });
    if (catId) p.append("category_id[]", catId);
    const { products, count } = await store<{ products: Product[]; count: number }>(`/products?${p}`);
    return { products, count };
  },
  async getProduct(handle) {
    const { products } = await store<{ products: Product[] }>(`/products?handle=${encodeURIComponent(handle)}&region_id=${REGION_ID}&fields=${PRODUCT_FIELDS}`);
    return products[0] ?? null;
  },
  async listCategories() {
    return (await store<{ product_categories: Category[] }>("/product-categories?limit=100&fields=id,name,handle,description,parent_category_id,rank")).product_categories;
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
