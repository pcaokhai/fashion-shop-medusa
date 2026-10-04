import type { Unit } from "./types";

// Synthetic subset for mock mode only; real mode calls /store/vn-address/*.
export const PROVINCES: Unit[] = [
  { code: "79", name: "Thành phố Hồ Chí Minh" },
  { code: "01", name: "Thành phố Hà Nội" },
  { code: "48", name: "Thành phố Đà Nẵng" },
  { code: "92", name: "Thành phố Cần Thơ" },
  { code: "31", name: "Thành phố Hải Phòng" },
  { code: "46", name: "Thành phố Huế" },
];

const WARD_NAMES: Record<string, string[]> = {
  "79": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Sài Gòn", "Phường Tân Định", "Phường Thủ Đức", "Phường An Khánh"],
  "01": ["Phường Hoàn Kiếm", "Phường Cửa Nam", "Phường Ba Đình", "Phường Hai Bà Trưng", "Phường Cầu Giấy"],
  "48": ["Phường Hải Châu", "Phường Thanh Khê", "Phường Sơn Trà", "Phường Ngũ Hành Sơn"],
  "92": ["Phường Ninh Kiều", "Phường Cái Khế", "Phường Bình Thủy"],
  "31": ["Phường Hồng Bàng", "Phường Ngô Quyền", "Phường Lê Chân"],
  "46": ["Phường Thuận Hóa", "Phường Phú Xuân", "Phường Vỹ Dạ"],
};

export const wardsOf = (province: string): Unit[] =>
  (WARD_NAMES[province] ?? []).map((name, i) => ({ code: `${province}-${i + 1}`, name }));
