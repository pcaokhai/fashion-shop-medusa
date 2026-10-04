// Pure: builds the Vietnamese order confirmation (subject, text, html). Customer text is HTML-escaped.
import { Vnd, formatVnd } from "./money"

export type OrderMail = {
  display_id: number
  email: string
  total: number
  shipping_total: number
  items: { title: string; variant_title?: string | null; quantity: number; unit_price: number }[]
  shipping_address?: { first_name?: string | null; last_name?: string | null; address_1?: string | null; address_2?: string | null } | null
  payment: "cod" | "other"
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)
const vnd = (n: number) => formatVnd(Vnd(Math.round(n)))

export function buildOrderMail(o: OrderMail) {
  const name = [o.shipping_address?.last_name, o.shipping_address?.first_name].filter(Boolean).join(" ") || "bạn"
  const lines = o.items.map((i) => ({ label: `${i.title}${i.variant_title ? ` (${i.variant_title})` : ""} × ${i.quantity}`, price: vnd(i.unit_price * i.quantity) }))
  const pay = o.payment === "cod" ? "Thanh toán khi nhận hàng (COD)" : "Đã thanh toán"
  const subject = `Xác nhận đơn hàng #${o.display_id}`
  const text = [
    `Xin chào ${name},`,
    `Cảm ơn bạn đã đặt hàng. Mã đơn #${o.display_id}.`,
    ...lines.map((l) => `- ${l.label}: ${l.price}`),
    `Phí vận chuyển: ${vnd(o.shipping_total)}`,
    `Tổng cộng: ${vnd(o.total)}`,
    pay,
  ].join("\n")
  const html = `<p>Xin chào ${esc(name)},</p><p>Cảm ơn bạn đã đặt hàng. Mã đơn <b>#${o.display_id}</b>.</p>
<table cellpadding="6">${lines.map((l) => `<tr><td>${esc(l.label)}</td><td align="right">${l.price}</td></tr>`).join("")}
<tr><td>Phí vận chuyển</td><td align="right">${vnd(o.shipping_total)}</td></tr>
<tr><td><b>Tổng cộng</b></td><td align="right"><b>${vnd(o.total)}</b></td></tr></table><p>${pay}</p>`
  return { subject, text, html }
}
