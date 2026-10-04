import "server-only";
import { checkoutMock } from "./mock";
import { checkoutReal } from "./real";

export const checkout = process.env.NEXT_PUBLIC_API_MODE === "real" ? checkoutReal : checkoutMock;
export type * from "./types";
