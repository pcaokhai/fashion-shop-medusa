// Pure, deterministic catalogue generator (no Medusa imports): same count => same products, every run.
// Money is integer VND. Used by seed.ts; B1b only raises the count.

export type Kind = "top" | "bottom" | "dress" | "shoe" | "accessory"
export type CategorySpec = { handle: string; name: string; parent: string | null }
export type VariantSpec = { sku: string; title: string; size: string | null; colour: string; price: number; stock: number }
export type ProductSpec = {
  handle: string
  title: string
  description: string
  categoryHandle: string
  kind: Kind
  colours: string[]
  sizeOption: string[] | null
  variants: VariantSpec[]
  salePrice: number | null
  metadata: { rating: number; sold: number; is_new: boolean }
}

const TREE: { name: string; kind: Kind; children: { name: string; leaves: string[] }[] }[] = [
  { name: "Áo", kind: "top", children: [
    { name: "Áo thun", leaves: ["Áo thun trơn", "Áo thun in hình"] },
    { name: "Áo sơ mi", leaves: ["Sơ mi công sở", "Sơ mi linen"] },
    { name: "Áo khoác", leaves: ["Áo khoác gió", "Áo khoác denim"] },
  ] },
  { name: "Quần", kind: "bottom", children: [
    { name: "Quần jeans", leaves: ["Jeans ống suông", "Jeans skinny"] },
    { name: "Quần tây & kaki", leaves: ["Quần tây", "Quần kaki"] },
    { name: "Quần short & jogger", leaves: ["Quần short", "Quần jogger"] },
  ] },
  { name: "Váy & đầm", kind: "dress", children: [
    { name: "Đầm", leaves: ["Đầm suông", "Đầm wrap"] },
    { name: "Chân váy", leaves: ["Chân váy chữ A", "Chân váy xếp ly"] },
    { name: "Set đồng bộ", leaves: ["Set áo và chân váy", "Set áo và quần"] },
  ] },
  { name: "Giày dép", kind: "shoe", children: [
    { name: "Giày", leaves: ["Giày sneaker", "Giày lười"] },
    { name: "Dép & sandal", leaves: ["Sandal quai ngang", "Dép đế bệt"] },
  ] },
  { name: "Phụ kiện", kind: "accessory", children: [
    { name: "Túi", leaves: ["Túi tote", "Túi đeo chéo"] },
    { name: "Mũ & khăn", leaves: ["Mũ lưỡi trai", "Khăn lụa"] },
    { name: "Thắt lưng & ví", leaves: ["Thắt lưng da", "Ví da"] },
  ] },
]

export const COLOURS = ["Đen", "Trắng", "Be", "Xanh navy", "Xanh rêu", "Nâu", "Hồng phấn", "Xám"] as const
const CLOTHES_SIZES = ["S", "M", "L", "XL"]
const SHOE_SIZES = ["37", "38", "39", "40"]
const PRICE_RANGE: Record<Kind, [number, number]> = {
  top: [129_000, 399_000], bottom: [249_000, 599_000], dress: [299_000, 899_000], shoe: [399_000, 1_299_000], accessory: [99_000, 699_000],
}
const MODIFIERS = [
  "cổ tròn", "form rộng", "họa tiết kẻ", "tông pastel", "phong cách Hàn", "chất liệu cotton", "thoáng mát", "basic",
  "dáng ngắn", "dáng dài", "đường may tinh tế", "hoạ tiết hoa nhí", "màu trơn", "cao cấp", "tối giản", "năng động",
  "thanh lịch", "vintage", "đi làm", "đi chơi", "mùa hè", "mùa thu", "unisex", "nữ tính", "trẻ trung", "co giãn",
  "chống nhăn", "dễ phối đồ", "bản giới hạn", "phiên bản mới", "dạo phố", "cuối tuần", "mềm mại", "bền màu",
  "nhẹ nhàng", "hiện đại", "cổ điển", "trang nhã", "tinh giản", "gọn nhẹ",
]

// mulberry32: tiny seeded PRNG
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

export function buildCategories(): CategorySpec[] {
  const out: CategorySpec[] = []
  for (const l1 of TREE) {
    const h1 = slug(l1.name)
    out.push({ handle: h1, name: l1.name, parent: null })
    for (const l2 of l1.children) {
      const h2 = slug(l2.name)
      out.push({ handle: h2, name: l2.name, parent: h1 })
      for (const leaf of l2.leaves) out.push({ handle: slug(leaf), name: leaf, parent: h2 })
    }
  }
  return out
}

const leaves = TREE.flatMap((l1) => l1.children.flatMap((l2) => l2.leaves.map((name) => ({ name, kind: l1.kind, handle: slug(name) }))))

const roundK = (n: number) => Math.round(n / 1000) * 1000

export function buildProducts(count: number): ProductSpec[] {
  const rand = rng(20261004)
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)] as T
  const seenInLeaf = new Map<string, number>()
  const products: ProductSpec[] = []
  for (let i = 0; i < count; i++) {
    const leaf = leaves[i % leaves.length] as (typeof leaves)[number]
    const k = seenInLeaf.get(leaf.handle) ?? 0
    seenInLeaf.set(leaf.handle, k + 1)
    const title = `${leaf.name} ${MODIFIERS[k % MODIFIERS.length]}${k >= MODIFIERS.length ? ` ${Math.floor(k / MODIFIERS.length) + 1}` : ""}`
    const handle = slug(title)
    const colours = [...new Set([pick(COLOURS), pick(COLOURS), pick(COLOURS)])].slice(0, 2 + Math.floor(rand() * 2)) // 2 or 3
    const sizeOption = leaf.kind === "accessory" ? null : leaf.kind === "shoe" ? SHOE_SIZES : CLOTHES_SIZES
    const [lo, hi] = PRICE_RANGE[leaf.kind]
    const price = roundK(lo + rand() * (hi - lo))
    const variants: VariantSpec[] = []
    for (const colour of colours) {
      for (const size of sizeOption ?? [null]) {
        const roll = rand()
        const stock = roll < 0.05 ? 0 : roll < 0.15 ? 1 + Math.floor(rand() * 3) : 5 + Math.floor(rand() * 56)
        variants.push({ sku: `${handle}-${slug(colour)}${size ? `-${size}` : ""}`.toUpperCase(), title: size ? `${size} / ${colour}` : colour, size, colour, price, stock })
      }
    }
    products.push({
      handle, title, categoryHandle: leaf.handle, kind: leaf.kind, colours, sizeOption, variants,
      description: `${title}: chất liệu dễ chịu, form gọn, dễ phối hằng ngày. Sản phẩm mẫu cho bản demo.`,
      salePrice: i % 4 === 0 ? roundK(price * 0.8) : null,
      metadata: { rating: Math.round((3.8 + rand() * 1.2) * 10) / 10, sold: Math.floor(rand() * 400), is_new: i % 5 === 1 },
    })
  }
  return products
}
