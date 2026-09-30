/* global process */
// CLI entry: always runs (no "is this the main module" heuristic, so symlinked/renamed invocations cannot silently no-op).
import { main } from "./check.mjs";

process.exit(main(process.env));
