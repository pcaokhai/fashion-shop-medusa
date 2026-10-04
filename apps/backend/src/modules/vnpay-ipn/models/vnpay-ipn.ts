import { model } from "@medusajs/framework/utils"

// One row per distinct IPN (TxnRef + TransactionNo). The unique index is the dedupe key: a replayed or concurrent
// duplicate cannot insert a second row, so it cannot settle twice. order_id / cart_id are plain references (rule 5).
export const VnpayIpn = model
  .define("vnpay_ipn", {
    id: model.id({ prefix: "vnpipn" }).primaryKey(),
    txn_ref: model.text(),
    transaction_no: model.text(),
    response_code: model.text(),
    amount_vnd: model.number(),
    order_id: model.text().nullable(),
  })
  .indexes([{ on: ["txn_ref", "transaction_no"], unique: true }])
