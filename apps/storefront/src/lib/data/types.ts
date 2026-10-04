import type { HttpTypes } from "@medusajs/types";

export type Product = HttpTypes.StoreProduct;
export type Category = HttpTypes.StoreProductCategory;
export type Region = HttpTypes.StoreRegion;
export type Cart = HttpTypes.StoreCart;

export type ProductSort = "newest" | "price-asc" | "price-desc";

export interface ProductQuery {
  category?: string; // category handle
  q?: string;
  sort?: ProductSort;
  onSale?: boolean;
  inStock?: boolean;
  maxPrice?: number; // integer VND
  limit?: number;
  offset?: number;
}

export interface ProductPage {
  products: Product[];
  count: number;
}

/** What pages call. `real` talks to Medusa, `mock` reads contracts/fixtures/medusa. */
export interface DataLayer {
  listProducts(query?: ProductQuery): Promise<ProductPage>;
  getProduct(handle: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  getRegion(): Promise<Region>;
  getCart(): Promise<Cart | null>;
  addToCart(variantId: string, quantity: number): Promise<Cart>;
  updateLine(lineId: string, quantity: number): Promise<Cart>;
  removeLine(lineId: string): Promise<Cart>;
}

const unit = (p: Product) => p.variants?.[0]?.calculated_price;
const priceOf = (p: Product) => unit(p)?.calculated_amount ?? 0;

/** Accent-insensitive fold, same intent as the real search (`phở` = `pho`). */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

function matches(p: Product, { q, onSale, inStock, maxPrice }: ProductQuery): boolean {
  const price = unit(p);
  const now = priceOf(p);
  if (q && !fold(p.title).includes(fold(q))) return false;
  if (onSale && !((price?.original_amount ?? now) > now)) return false;
  if (inStock && !p.variants?.some((v) => (v.inventory_quantity ?? 0) > 0)) return false;
  if (maxPrice !== undefined && now > maxPrice) return false;
  return true;
}

/** Filter, sort and page a full product list. Shared by mock and real mode (Medusa's Store API cannot filter or sort by price). */
export function applyQuery(all: Product[], query: ProductQuery): ProductPage {
  const { sort = "newest", limit = 20, offset = 0 } = query;
  const list = all.filter((p) => matches(p, query));
  if (sort === "price-asc") list.sort((a, b) => priceOf(a) - priceOf(b));
  if (sort === "price-desc") list.sort((a, b) => priceOf(b) - priceOf(a));
  return { products: list.slice(offset, offset + limit), count: list.length };
}
