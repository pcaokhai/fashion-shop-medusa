import "server-only";
import { mock } from "./mock";
import { real } from "./real";
import type { DataLayer } from "./types";

/** `NEXT_PUBLIC_API_MODE=real` talks to Medusa; anything else (default) reads fixtures. */
export const data: DataLayer = process.env.NEXT_PUBLIC_API_MODE === "real" ? real : mock;
export type * from "./types";
