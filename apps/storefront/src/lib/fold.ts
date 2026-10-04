/** Accent-insensitive key: `Phường Bến Nghé` → `phuong ben nghe`. */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
