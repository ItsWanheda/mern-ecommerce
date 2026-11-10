import test from "node:test";
import assert from "node:assert/strict";
import { completeInitialBoot, hasCompletedInitialBoot } from "../src/lib/initial-boot.js";

test("initial boot flag is unavailable during server rendering", () => {
  const previousWindow = globalThis.window;
  try {
    delete globalThis.window;
    assert.equal(hasCompletedInitialBoot(), false);
    completeInitialBoot();
    assert.equal(hasCompletedInitialBoot(), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("initial boot flag is shared across route-shell remounts in the browser", () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {};
    assert.equal(hasCompletedInitialBoot(), false);
    completeInitialBoot();
    assert.equal(hasCompletedInitialBoot(), true);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
