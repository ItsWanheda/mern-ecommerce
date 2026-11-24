import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backendApp = await readFile(new URL("../app.js", import.meta.url), "utf8");
const frontendConfig = await readFile(new URL("../../frontend/next.config.js", import.meta.url), "utf8");

test("Express and Next.js use matching bounded JSON proxy request limits", () => {
  assert.match(backendApp, /express\.json\(\{\s*limit:\s*["']18mb["']/);
  assert.match(frontendConfig, /proxyClientMaxBodySize:\s*["']18mb["']/);
});
