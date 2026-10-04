import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { signData, sign } from "../tools/sims/vnpay/sign.mjs";

const golden = JSON.parse(readFileSync(new URL("../contracts/vnpay/golden-vectors.json", import.meta.url), "utf8"));

for (const v of golden.vectors.filter((x) => x.sign_data)) {
  test(`VNPay simulator reproduces golden vector ${v.name}`, () => {
    assert.equal(signData(v.params), v.sign_data);
    assert.equal(sign(v.params, golden.secret), v.vnp_SecureHash);
  });
}

test("VNPay simulator rejects the tampered vector", () => {
  const v = golden.vectors.find((x) => x.expect_valid === false);
  assert.notEqual(sign(v.params, golden.secret), v.vnp_SecureHash);
});
