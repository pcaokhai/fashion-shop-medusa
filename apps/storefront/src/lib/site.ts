export const SITE = {
  name: "VN Commerce",
  tagline: "Thời trang gọn gàng cho nhịp sống thành phố",
  hotline: "1900 0000",
  email: "xinchao@example.test",
  address: "Số 1 Đường Mẫu, Quận 1, TP. Hồ Chí Minh",
  taxId: "0000000000",
} as const;

export const DEMO_BANNER = process.env.NEXT_PUBLIC_DEMO_BANNER === "1";

/** category handle → token suffix used by --color-cat-* */
export const CATEGORY_TINT: Record<string, string> = { ao: "ao", quan: "quan", vay: "vay", giay: "giay", "phu-kien": "phukien" };
