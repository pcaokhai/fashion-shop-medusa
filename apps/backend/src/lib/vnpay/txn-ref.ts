// vnp_TxnRef = "VCK" + the payment session id without its "payses_" prefix, so the IPN finds the session without a lookup table.
const SESSION_PREFIX = "payses_"
const TXN_PREFIX = "VCK"

export const sessionIdToTxnRef = (sessionId: string): string => `${TXN_PREFIX}${sessionId.replace(SESSION_PREFIX, "")}`

/** null when the ref does not look like one of ours. */
export function txnRefToSessionId(txnRef: string): string | null {
  return /^VCK[0-9A-Za-z]{10,60}$/.test(txnRef) ? `${SESSION_PREFIX}${txnRef.slice(TXN_PREFIX.length)}` : null
}
