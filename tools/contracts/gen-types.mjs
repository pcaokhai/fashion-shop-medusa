// Storefront types from contracts/openapi.yaml (openapi-typescript, OpenAPI 3.1).
import openapiTS, { astToString } from "openapi-typescript";
import { pathToFileURL } from "node:url";
import { HEADER, specPath, run, isMain } from "./gen-util.mjs";

export const TYPES_PATH = "apps/storefront/src/generated/api.ts";

export async function buildTypes() {
  const ast = await openapiTS(pathToFileURL(specPath), { alphabetize: true });
  return HEADER + astToString(ast);
}

if (isMain(import.meta.url)) await run(buildTypes, TYPES_PATH);
