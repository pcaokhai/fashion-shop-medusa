export type PaymentMethod = "cod" | "vnpay";

export interface Unit {
  code: string;
  name: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  amount: number; // integer VND
}

export interface CheckoutInput {
  name: string;
  phone: string;
  email: string;
  provinceCode: string;
  wardCode: string;
  address: string;
  note: string;
  shippingOptionId: string;
  payment: PaymentMethod;
}

/** Display-only copy of what was ordered; lives in a short cookie so guests can see the confirmation. */
export interface OrderSnapshot {
  id: string | null;
  ref: string;
  payment: PaymentMethod;
  subtotal: number;
  shipping: number;
  total: number;
  items: { title: string; variant: string; quantity: number; unit: number }[];
  name: string;
  phone: string;
  email: string;
  addressLine: string;
  shippingName: string;
}

export type DisplayStatus = "PAID" | "PENDING_CONFIRMATION" | "FAILED" | "CANCELLED_BY_USER";

/** Mirrors PaymentReturnStatus in contracts/openapi.yaml. */
export interface PaymentReturnStatus {
  checksum_valid: boolean;
  display_status: DisplayStatus;
  order_id: string | null;
  cart_id: string | null;
}

export interface CheckoutLayer {
  listProvinces(): Promise<Unit[]>;
  listWards(provinceCode: string): Promise<Unit[]>;
  listShippingOptions(): Promise<ShippingOption[]>;
  /** COD completes the order (`orderId` set, cart cleared); VNPay returns the gateway URL and keeps the cart. */
  placeOrder(input: CheckoutInput, ctx: { addressLine: string; amount: number }): Promise<{ next: string; orderId: string | null; ref: string }>;
  /** Display only: reports what the backend knows; never completes anything. */
  verifyVnpayReturn(query: Record<string, string>): Promise<PaymentReturnStatus>;
  clearCart(): Promise<void>;
}
