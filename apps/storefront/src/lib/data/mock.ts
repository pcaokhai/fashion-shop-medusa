import "server-only";
import { cookies } from "next/headers";
import products from "../../../../../contracts/fixtures/medusa/products.json";
import categories from "../../../../../contracts/fixtures/medusa/categories.json";
import regions from "../../../../../contracts/fixtures/medusa/regions.json";
import emptyCart from "../../../../../contracts/fixtures/medusa/carts.json";
import { matches, type Cart, Category, DataLayer, Product, ProductQuery, Region } from "./types";

export const CART_COOKIE = "vck_mock_cart";
type Line = { variantId: string; quantity: number };

const all = products.products as unknown as Product[];
const price = (p: Product) => p.variants?.[0]?.calculated_price?.calculated_amount ?? 0;

export const readLines = async (): Promise<Line[]> => {
  try {
    return JSON.parse((await cookies()).get(CART_COOKIE)?.value ?? "[]") as Line[];
  } catch {
    return [];
  }
};

const writeLines = async (lines: Line[]) => {
  (await cookies()).set(CART_COOKIE, JSON.stringify(lines), { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
};

// Mock cart totals are recomputed from fixtures on every read; money stays integer VND.
function hydrate(lines: Line[]): Cart {
  const items = lines.flatMap((l) => {
    const product = all.find((p) => p.variants?.some((v) => v.id === l.variantId));
    const variant = product?.variants?.find((v) => v.id === l.variantId);
    if (!product || !variant) return [];
    const unit = variant.calculated_price?.calculated_amount ?? 0;
    return [{
      id: `line_${l.variantId}`, title: product.title, product_title: product.title, product_handle: product.handle,
      variant_id: variant.id, variant_title: variant.title, thumbnail: product.thumbnail, quantity: l.quantity,
      unit_price: unit, subtotal: unit * l.quantity, total: unit * l.quantity,
    }];
  });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  return { ...emptyCart.cart, id: "cart_mock", items, subtotal, item_total: subtotal, total: subtotal } as unknown as Cart;
}

const change = async (fn: (lines: Line[]) => Line[]) => {
  const next = fn(await readLines()).filter((l) => l.quantity > 0);
  await writeLines(next);
  return hydrate(next);
};

export const mock: DataLayer = {
  listProducts(query: ProductQuery = {}) {
    const { category, q, sort = "newest", limit = 20, offset = 0 } = query;
    const needle = q ? fold(q) : "";
    let list = all.filter((p) => (!category || p.categories?.some((c) => c.handle === category)) && (!needle || fold(p.title).includes(needle)) && matches(p, query));
    if (sort === "price-asc") list = [...list].sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => price(b) - price(a));
    return Promise.resolve({ products: list.slice(offset, offset + limit), count: list.length });
  },
  getProduct(handle) {
    return Promise.resolve(all.find((p) => p.handle === handle) ?? null);
  },
  listCategories() {
    return Promise.resolve(categories.product_categories as unknown as Category[]);
  },
  getRegion() {
    return Promise.resolve(regions.regions[0] as unknown as Region);
  },
  async getCart() {
    const lines = await readLines();
    return lines.length ? hydrate(lines) : null;
  },
  addToCart: (variantId, quantity) =>
    change((ls) => (ls.some((l) => l.variantId === variantId) ? ls.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + quantity } : l)) : [...ls, { variantId, quantity }])),
  updateLine: (lineId, quantity) => change((ls) => ls.map((l) => (`line_${l.variantId}` === lineId ? { ...l, quantity } : l))),
  removeLine: (lineId) => change((ls) => ls.filter((l) => `line_${l.variantId}` !== lineId)),
};

// Accent-insensitive match, same intent as the real search (`phở` = `pho`).
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
