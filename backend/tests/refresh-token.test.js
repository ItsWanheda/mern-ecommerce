import test from "node:test";
import assert from "node:assert/strict";
import { rotateRefreshToken } from "../lib/refresh-token.js";

test("refresh token rotation replaces the old token and rejects replay", async () => {
  const tokens = new Map([["refresh_token:user-1", "old-token"]]);
  const redisClient = {
    eval: async (_script, _numKeys, key, presented, next) => {
      if (tokens.get(key) !== presented) return 0;
      tokens.set(key, next);
      return 1;
    },
  };
  assert.equal(await rotateRefreshToken({ redisClient, userId: "user-1", presentedToken: "old-token", nextRefreshToken: "new-token" }), true);
  assert.equal(tokens.get("refresh_token:user-1"), "new-token");
  assert.equal(await rotateRefreshToken({ redisClient, userId: "user-1", presentedToken: "old-token", nextRefreshToken: "replayed-token" }), false);
  assert.equal(tokens.get("refresh_token:user-1"), "new-token");
});
