import test from "node:test";
import assert from "node:assert/strict";
import { getClientIpAddress, getTrustProxyHops, normalizeIpAddress } from "../lib/client-ip.js";

test("client IP uses Express's proxy-resolved req.ip and ignores raw forwarded headers", () => {
  const request = {
    ip: "203.0.113.18",
    socket: { remoteAddress: "10.0.0.8" },
    headers: { "x-forwarded-for": "198.51.100.90" },
  };
  assert.equal(getClientIpAddress(request), "203.0.113.18");
});

test("client IP falls back to socket peer and normalizes IPv4-mapped IPv6", () => {
  assert.equal(getClientIpAddress({ ip: "not-an-ip", socket: { remoteAddress: "::ffff:192.0.2.44" } }), "192.0.2.44");
  assert.equal(normalizeIpAddress("2001:db8::1"), "2001:db8::1");
  assert.equal(normalizeIpAddress("unknown"), "");
});

test("trusted proxy hop count defaults to one and rejects invalid values", () => {
  assert.equal(getTrustProxyHops(undefined), 1);
  assert.equal(getTrustProxyHops(""), 1);
  assert.equal(getTrustProxyHops("0"), 0);
  assert.equal(getTrustProxyHops("2"), 2);
  assert.throws(() => getTrustProxyHops("-1"), /TRUST_PROXY_HOPS/);
  assert.throws(() => getTrustProxyHops("true"), /TRUST_PROXY_HOPS/);
  assert.throws(() => getTrustProxyHops("9"), /TRUST_PROXY_HOPS/);
});
