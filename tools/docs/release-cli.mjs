/* global process */
// CLI entry: always runs (no "is this the main module" heuristic, so symlinked/renamed invocations cannot silently no-op).
import { main } from "./release.mjs";

process.exit(main(process.env, process.argv.slice(2)));
