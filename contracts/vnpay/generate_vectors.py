#!/usr/bin/env python3
"""Generate VNPay checksum golden vectors (docs/03 §3).

Rule under test: sort vnp_* params (excluding vnp_SecureHash/vnp_SecureHashType) by key,
url-encode key and value (application/x-www-form-urlencoded, space -> '+'), join with '&',
HMAC-SHA512 with the TEST secret, lowercase hex. Both the TS provider and the VNPay simulator
MUST reproduce every vector. Re-verify the encoding rule against the VNPay sandbox in VCK-203.
The secret below is a fake test value, never a real merchant secret.
"""
import hashlib, hmac, json, urllib.parse
from pathlib import Path

SECRET = "TESTSECRETVCK0000000000000000000"

def sign(params: dict) -> tuple[str, str]:
    items = sorted((k, v) for k, v in params.items() if k not in ("vnp_SecureHash", "vnp_SecureHashType") and v != "")
    data = "&".join(f"{urllib.parse.quote_plus(k)}={urllib.parse.quote_plus(v)}" for k, v in items)
    return data, hmac.new(SECRET.encode(), data.encode(), hashlib.sha512).hexdigest()

CASES = {
    "pay_request_basic": {
        "vnp_Version": "2.1.0", "vnp_Command": "pay", "vnp_TmnCode": "VCKTEST1",
        "vnp_Amount": "25900000", "vnp_CurrCode": "VND", "vnp_TxnRef": "VCK20261001A1B2C3",
        "vnp_OrderInfo": "Thanh toan don hang VCK20261001A1B2C3", "vnp_OrderType": "other",
        "vnp_Locale": "vn", "vnp_ReturnUrl": "https://shop.example.test/checkout/vnpay-return",
        "vnp_IpAddr": "127.0.0.1", "vnp_CreateDate": "20261001103000", "vnp_ExpireDate": "20261001104500",
    },
    "ipn_success": {
        "vnp_Amount": "25900000", "vnp_BankCode": "NCB", "vnp_OrderInfo": "Thanh toan don hang VCK20261001A1B2C3",
        "vnp_PayDate": "20261001103512", "vnp_ResponseCode": "00", "vnp_TmnCode": "VCKTEST1",
        "vnp_TransactionNo": "14000001", "vnp_TransactionStatus": "00", "vnp_TxnRef": "VCK20261001A1B2C3",
    },
    "ipn_user_cancelled": {
        "vnp_Amount": "25900000", "vnp_OrderInfo": "Thanh toan don hang VCK20261001D4E5F6",
        "vnp_ResponseCode": "24", "vnp_TmnCode": "VCKTEST1", "vnp_TransactionNo": "0",
        "vnp_TransactionStatus": "02", "vnp_TxnRef": "VCK20261001D4E5F6",
    },
    "unicode_and_space_encoding": {
        "vnp_Amount": "100000", "vnp_OrderInfo": "Áo thun nam size M & quà tặng",
        "vnp_TmnCode": "VCKTEST1", "vnp_TxnRef": "VCK20261001ENC001",
    },
}

def main() -> None:
    out = []
    for name, params in CASES.items():
        data, digest = sign(params)
        out.append({"name": name, "params": params, "sign_data": data, "vnp_SecureHash": digest})
    tampered = dict(CASES["ipn_success"], vnp_Amount="25900001")
    out.append({"name": "ipn_tampered_amount_must_fail", "params": tampered,
                "vnp_SecureHash": sign(CASES["ipn_success"])[1], "expect_valid": False})
    doc = {"algorithm": "HMAC-SHA512", "secret": SECRET, "vectors": out}
    Path(__file__).with_name("golden-vectors.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")

if __name__ == "__main__":
    main()
