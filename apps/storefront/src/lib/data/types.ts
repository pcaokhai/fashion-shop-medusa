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
