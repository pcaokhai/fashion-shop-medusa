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

/** Filters shared by both modes. ponytail: real mode applies them in memory over a 100-item window, move to Meilisearch facets (B2) if it matters. */
export function matches(p: Product, { onSale, inStock, maxPrice }: ProductQuery): boolean {
  const price = unit(p);
  const now = price?.calculated_amount ?? 0;
  if (onSale && !((price?.original_amount ?? now) > now)) return false;
  if (inStock && !p.variants?.some((v) => (v.inventory_quantity ?? 0) > 0)) return false;
  if (maxPrice !== undefined && now > maxPrice) return false;
  return true;
}
