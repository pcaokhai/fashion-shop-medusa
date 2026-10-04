// 2-tier Vietnamese addresses (province, ward) from the committed data.json (tools/seed `address-data`). Pure lookups.
import data from "./data.json"

export type AdminUnit = { code: string; name: string; level: "PROVINCE" | "WARD"; ghn_code: null }

const provinces = data.provinces.map((p): AdminUnit => ({ ...p, level: "PROVINCE", ghn_code: null }))
const wards = data.wards as Record<string, { code: string; name: string }[]>

export const listProvinces = (): AdminUnit[] => provinces

/** null when the province code does not exist. */
export const listWards = (provinceCode: string): AdminUnit[] | null =>
  wards[provinceCode]?.map((w): AdminUnit => ({ ...w, level: "WARD", ghn_code: null })) ?? null

export const isWardOf = (provinceCode: unknown, wardCode: unknown): boolean =>
  typeof provinceCode === "string" && typeof wardCode === "string" && !!wards[provinceCode]?.some((w) => w.code === wardCode)
