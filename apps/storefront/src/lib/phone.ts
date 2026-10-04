/** Vietnamese mobile/landline: 10 digits starting 0, or +84 / 84 followed by 9 digits. Spaces, dots and dashes ignored. */
export const isVnPhone = (raw: string) => /^(0\d{9}|(\+?84)\d{9})$/.test(raw.replace(/[\s.-]/g, ""));
