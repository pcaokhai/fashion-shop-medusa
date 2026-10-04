// VNPay simulator (dev/e2e only). Pay page -> signed browser return + signed server-to-server IPN, like the real gateway.
// Failure modes are switches (SIM_MODE env or GET /sim/mode?set=<mode>), not code forks:
//   normal           IPN follows the return after IPN_DELAY_MS (default 1500) so a "pending" state is visible
//   late             IPN after 20 s            duplicate        IPN sent twice
//   wrong_signature  IPN with a tampered hash  lost             no IPN at all (abandoned / unreachable)
import { createServer } from "node:http";
import { sign, withHash } from "./sign.mjs";

const port = Number(process.env.PORT ?? 9100);
const SECRET = process.env.VNPAY_HASH_SECRET ?? "TESTSECRETVCK0000000000000000000"; // fake test secret, same as the golden vectors
const IPN_URL = process.env.IPN_URL ?? "http://host.docker.internal:9000/hooks/vnpay/ipn";
const IPN_DELAY_MS = Number(process.env.IPN_DELAY_MS ?? 1500);
const MODES = ["normal", "late", "duplicate", "wrong_signature", "lost"];
let mode = MODES.includes(process.env.SIM_MODE ?? "") ? process.env.SIM_MODE : "normal";
let txnNo = 14_000_000 + Math.floor(Math.random() * 1000);

const html = (body) =>
  `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VNPAY Simulator</title>
<body style="font-family:system-ui;max-width:28rem;margin:3rem auto;padding:0 1rem">${body}</body></html>`;
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function sendIpn(params) {
  const url = `${IPN_URL}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`IPN ${params.vnp_TxnRef} -> ${res.status} ${await res.text()}`);
  } catch (e) {
    console.log(`IPN ${params.vnp_TxnRef} failed: ${e.message}`);
  }
}

function dispatchIpn(result) {
  if (mode === "lost") return;
  const signed = mode === "wrong_signature" ? { ...result, vnp_SecureHash: "0".repeat(128) } : result;
  const delay = mode === "late" ? 20_000 : IPN_DELAY_MS;
  setTimeout(() => void sendIpn(signed), delay);
  if (mode === "duplicate") setTimeout(() => void sendIpn(signed), delay + 300);
}

const OUTCOMES = {
  success: { vnp_ResponseCode: "00", vnp_TransactionStatus: "00" },
  cancel: { vnp_ResponseCode: "24", vnp_TransactionStatus: "02" },
  fail: { vnp_ResponseCode: "51", vnp_TransactionStatus: "02" },
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://sim");
  const send = (status, type, body) => (res.writeHead(status, { "content-type": type }), res.end(body));
  const q = Object.fromEntries(url.searchParams);

  if (url.pathname === "/health") return send(200, "application/json", JSON.stringify({ status: "ok", sim: "vnpay", mode }));

  if (url.pathname === "/sim/mode") {
    if (MODES.includes(q.set ?? "")) mode = q.set;
    return send(200, "application/json", JSON.stringify({ mode }));
  }

  if (url.pathname === "/paymentv2/vpcpay.html") {
    if (!q.vnp_SecureHash || sign(q, SECRET) !== q.vnp_SecureHash) return send(400, "text/html; charset=utf-8", html("<h1>Sai chữ ký</h1>"));
    const next = (outcome) => `/sim/complete?${new URLSearchParams({ ...q, outcome })}`;
    return send(200, "text/html; charset=utf-8", html(
      `<h1>VNPAY Simulator</h1><p>Đơn hàng <b>${esc(q.vnp_TxnRef)}</b></p><p>Số tiền: <b>${Number(q.vnp_Amount) / 100} VND</b></p>
<p><a href="${esc(next("success"))}">Thanh toán thành công</a></p><p><a href="${esc(next("fail"))}">Thẻ không đủ số dư</a></p><p><a href="${esc(next("cancel"))}">Hủy giao dịch</a></p>`,
    ));
  }

  if (url.pathname === "/sim/complete") {
    const { outcome = "cancel", ...pay } = q;
    if (!pay.vnp_SecureHash || sign(pay, SECRET) !== pay.vnp_SecureHash || !OUTCOMES[outcome]) return send(400, "text/plain", "bad request");
    const ok = outcome === "success";
    const result = withHash({
      vnp_Amount: pay.vnp_Amount, ...(ok ? { vnp_BankCode: "NCB" } : {}), vnp_OrderInfo: pay.vnp_OrderInfo, ...(ok ? { vnp_PayDate: pay.vnp_CreateDate } : {}),
      ...OUTCOMES[outcome], vnp_TmnCode: pay.vnp_TmnCode, vnp_TransactionNo: ok ? String(++txnNo) : "0", vnp_TxnRef: pay.vnp_TxnRef,
    }, SECRET);
    dispatchIpn(result);
    res.writeHead(302, { location: `${pay.vnp_ReturnUrl}?${new URLSearchParams(result)}` });
    return res.end();
  }

  send(404, "application/json", JSON.stringify({ error: "not_found" }));
}).listen(port); // dual-stack: wget "localhost" resolves to ::1
