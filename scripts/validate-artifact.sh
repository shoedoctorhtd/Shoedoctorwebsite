#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}

node --input-type=module - "${worker}" "${hosting}" <<'NODE'
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const [workerPath, hostingPath] = process.argv.slice(2);
const hosting = JSON.parse(await readFile(hostingPath, "utf8"));
if (Object.hasOwn(hosting, "r2") || JSON.stringify(hosting).includes("PRODUCT_IMAGES")) {
  throw new Error("The packaged hosting manifest must not require an R2 binding.");
}

const wranglerPath = join(dirname(workerPath), "wrangler.json");
const deployment = JSON.parse(await readFile(wranglerPath, "utf8"));
const serializedDeployment = JSON.stringify(deployment);
if (
  (Array.isArray(deployment.r2_buckets) && deployment.r2_buckets.length > 0) ||
  serializedDeployment.includes("PRODUCT_IMAGES") ||
  serializedDeployment.includes("shoe-doctor-product-images")
) {
  throw new Error("The generated Worker deployment configuration must not require R2.");
}

const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("sites-validation", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href);
if (!worker.default || typeof worker.default.fetch !== "function") {
  throw new Error("dist/server/index.js must have an ESM default export with fetch(request, env, ctx)");
}
NODE

echo "Validated Sites artifact: ESM Worker default.fetch and hosting manifest are present."
