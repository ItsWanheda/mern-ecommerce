import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import axios from "../src/lib/axios.js";
import { useCartStore } from "../src/stores/useCartStore.js";
import { useWishlistStore } from "../src/stores/useWishlistStore.js";

let previousWindow;
let previousAdapter;
let storage;

const createStorage = () => {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; },
  };
};

const response = (config, data = {}) => ({
  data, status: 200, statusText: "OK", headers: {}, config,
});

const resetStores = () => {
  useCartStore.setState({
    cart: [], coupon: null, total: 0, subtotal: 0, productDiscountAmount: 0,
    isCouponApplied: false, authenticated: false, accountUserId: null,
    isMergingGuestCart: false,
  });
  useWishlistStore.setState({
    items: [], localHydrated: false, isAuthenticated: false, accountUserId: null,
    isSyncing: false, accountSynced: false, guestOnlyIds: [],
  });
};

beforeEach(() => {
  previousWindow = globalThis.window;
  previousAdapter = axios.defaults.adapter;
  storage = createStorage();
  globalThis.window = { localStorage: storage };
  resetStores();
});

afterEach(() => {
  axios.defaults.adapter = previousAdapter;
  resetStores();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;
});

test("authenticated clearCart deletes the server cart before clearing local state", async () => {
  useCartStore.setState({
    authenticated: true,
    accountUserId: "account-a",
    cart: [{ _id: "product-1", quantity: 2, price: 500 }],
    subtotal: 1000,
    total: 1000,
  });
  const calls = [];
  axios.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url });
    return response(config, { success: true });
  };

  const result = await useCartStore.getState().clearCart();

  assert.equal(result, true);
  assert.deepEqual(calls, [{ method: "delete", url: "/cart" }]);
  assert.deepEqual(useCartStore.getState().cart, []);
  assert.equal(useCartStore.getState().total, 0);
});

test("authenticated clearCart keeps the visible cart when the server delete fails", async () => {
  const initialCart = [{ _id: "product-2", quantity: 1, price: 800 }];
  useCartStore.setState({
    authenticated: true,
    accountUserId: "account-a",
    cart: initialCart,
    subtotal: 800,
    total: 800,
  });
  axios.defaults.adapter = async () => {
    throw new Error("network unavailable");
  };

  const result = await useCartStore.getState().clearCart();

  assert.equal(result, false);
  assert.deepEqual(useCartStore.getState().cart, initialCart);
  assert.equal(useCartStore.getState().total, 800);
});

test("wishlist imports only the dedicated guest list and never the old unscoped account mirror", async () => {
  storage.setItem("computer-hardware-guest-wishlist", JSON.stringify([{ _id: "guest-product", name: "Guest" }]));
  storage.setItem("tik-boutique-saved-products", JSON.stringify([{ _id: "legacy-account-product", name: "Legacy" }]));
  const postedIds = [];
  let activeAccount = "account-a";
  axios.defaults.adapter = async (config) => {
    if (config.url === "/account/wishlist" && config.method === "post") {
      postedIds.push(JSON.parse(config.data).productId);
      return response(config, { products: [] });
    }
    if (config.url === "/account/wishlist" && config.method === "get") {
      return response(config, { products: [{ _id: activeAccount + "-product", name: activeAccount }] });
    }
    throw new Error("Unexpected request: " + config.method + " " + config.url);
  };

  await useWishlistStore.getState().setAuthenticated(true, "account-a");

  assert.deepEqual(postedIds, ["guest-product"]);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), ["account-a-product"]);
  assert.equal(storage.getItem("computer-hardware-guest-wishlist"), null);
  assert.equal(storage.getItem("computer-hardware-pending-wishlist:account-a"), null);
  assert.notEqual(storage.getItem("tik-boutique-saved-products"), null);

  await useWishlistStore.getState().setAuthenticated(false);
  assert.deepEqual(useWishlistStore.getState().items, []);

  activeAccount = "account-b";
  await useWishlistStore.getState().setAuthenticated(true, "account-b");
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), ["account-b-product"]);
  assert.deepEqual(postedIds, ["guest-product"]);
});

test("failed guest-wishlist sync remains queued for the same account and can be retried", async () => {
  storage.setItem("computer-hardware-guest-wishlist", JSON.stringify([{ _id: "guest-retry", name: "Retry" }]));
  let postAttempts = 0;
  axios.defaults.adapter = async (config) => {
    if (config.url === "/account/wishlist" && config.method === "post") {
      postAttempts += 1;
      if (postAttempts === 1) throw new Error("temporary network issue");
      return response(config, { products: [] });
    }
    if (config.url === "/account/wishlist" && config.method === "get") {
      return response(config, {
        products: postAttempts > 1 ? [{ _id: "guest-retry", name: "Retry" }] : [],
      });
    }
    throw new Error("Unexpected request: " + config.method + " " + config.url);
  };

  await useWishlistStore.getState().setAuthenticated(true, "account-retry");

  assert.equal(postAttempts, 1);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), ["guest-retry"]);
  assert.deepEqual(useWishlistStore.getState().guestOnlyIds, ["guest-retry"]);
  assert.notEqual(storage.getItem("computer-hardware-pending-wishlist:account-retry"), null);
  assert.equal(storage.getItem("computer-hardware-guest-wishlist"), null);

  // A different account on the same browser must not inherit account-retry's pending import.
  await useWishlistStore.getState().setAuthenticated(false);
  let activeAccount = "account-other";
  const serverWishlists = new Map([
    ["account-other", [{ _id: "account-other-product" }]],
  ]);
  axios.defaults.adapter = async (config) => {
    if (config.url === "/account/wishlist" && config.method === "post") {
      postAttempts += 1;
      const productId = JSON.parse(config.data).productId;
      serverWishlists.set(activeAccount, [
        ...(serverWishlists.get(activeAccount) || []),
        { _id: productId },
      ]);
      return response(config, { products: serverWishlists.get(activeAccount) });
    }
    if (config.url === "/account/wishlist" && config.method === "get") {
      return response(config, { products: serverWishlists.get(activeAccount) || [] });
    }
    throw new Error("Unexpected request: " + config.method + " " + config.url);
  };
  await useWishlistStore.getState().setAuthenticated(true, "account-other");
  assert.equal(postAttempts, 1);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), ["account-other-product"]);
  assert.notEqual(storage.getItem("computer-hardware-pending-wishlist:account-retry"), null);
  assert.equal(storage.getItem("computer-hardware-pending-wishlist:account-other"), null);

  await useWishlistStore.getState().setAuthenticated(false);
  activeAccount = "account-retry";
  await useWishlistStore.getState().setAuthenticated(true, "account-retry");

  assert.equal(postAttempts, 2);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), ["guest-retry"]);
  assert.deepEqual(useWishlistStore.getState().guestOnlyIds, []);
  assert.equal(storage.getItem("computer-hardware-pending-wishlist:account-retry"), null);
  assert.equal(useWishlistStore.getState().accountSynced, true);
});


test("failed authenticated wishlist additions stay in that account's retry queue", async () => {
  const product = { _id: "account-favorite", name: "Account favorite" };
  const serverProducts = new Map();
  let postAttempts = 0;
  let activeAccount = "account-add";
  axios.defaults.adapter = async (config) => {
    if (config.url === "/account/wishlist" && config.method === "post") {
      postAttempts += 1;
      if (postAttempts === 1) throw new Error("temporary network issue");
      serverProducts.set(activeAccount, [
        ...(serverProducts.get(activeAccount) || []),
        { _id: JSON.parse(config.data).productId, name: product.name },
      ]);
      return response(config, { products: serverProducts.get(activeAccount) });
    }
    if (config.url === "/account/wishlist" && config.method === "get") {
      return response(config, { products: serverProducts.get(activeAccount) || [] });
    }
    throw new Error("Unexpected request: " + config.method + " " + config.url);
  };

  await useWishlistStore.getState().setAuthenticated(true, "account-add");
  useWishlistStore.getState().toggleSaved(product);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(postAttempts, 1);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), [product._id]);
  assert.deepEqual(useWishlistStore.getState().guestOnlyIds, [product._id]);
  assert.notEqual(storage.getItem("computer-hardware-pending-wishlist:account-add"), null);
  assert.equal(useWishlistStore.getState().accountSynced, false);

  await useWishlistStore.getState().setAuthenticated(false);
  await useWishlistStore.getState().setAuthenticated(true, "account-add");

  assert.equal(postAttempts, 2);
  assert.deepEqual(useWishlistStore.getState().items.map((item) => item._id), [product._id]);
  assert.deepEqual(useWishlistStore.getState().guestOnlyIds, []);
  assert.equal(storage.getItem("computer-hardware-pending-wishlist:account-add"), null);
  assert.equal(useWishlistStore.getState().accountSynced, true);
});
