"use client";

import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios.js";

const GUEST_STORAGE_KEY = "computer-hardware-guest-wishlist";
const GUEST_MIGRATION_OWNER_KEY = "computer-hardware-guest-wishlist-owner";

const pendingStorageKey = (userId) => "computer-hardware-pending-wishlist:" + encodeURIComponent(String(userId));

const readStoredProducts = (key) => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((product) => product && typeof product._id === "string")
      : [];
  } catch {
    return [];
  }
};

const writeStoredProducts = (key, products) => {
  if (typeof window === "undefined") return false;
  try {
    if (!products.length) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(products));
    return true;
  } catch {
    toast.error("ذخیره علاقه‌مندی‌ها در این مرورگر امکان‌پذیر نیست");
    return false;
  }
};

// The previous key mixed guest data with a server mirror and had no owner ID.
// It is intentionally not imported: doing so could transfer one account's list to another.
const readGuestProducts = () => {
  if (typeof window === "undefined") return [];
  try {
    if (window.localStorage.getItem(GUEST_MIGRATION_OWNER_KEY)) return [];
  } catch {
    return [];
  }
  return readStoredProducts(GUEST_STORAGE_KEY);
};

const writeGuestProducts = (products) => {
  if (typeof window === "undefined") return false;
  try {
    if (!products.length) {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
      return true;
    }
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(products));
    // A new anonymous action starts a fresh guest list, separate from a prior account's migration.
    window.localStorage.removeItem(GUEST_MIGRATION_OWNER_KEY);
    return true;
  } catch {
    toast.error("ذخیره علاقه‌مندی‌ها در این مرورگر امکان‌پذیر نیست");
    return false;
  }
};

const readPendingProducts = (userId) => readStoredProducts(pendingStorageKey(userId));
const writePendingProducts = (userId, products) => writeStoredProducts(pendingStorageKey(userId), products);

const mergeProducts = (...collections) => {
  const products = new Map();
  for (const collection of collections) {
    for (const product of Array.isArray(collection) ? collection : []) {
      if (product && typeof product._id === "string" && !products.has(product._id)) {
        products.set(product._id, product);
      }
    }
  }
  return [...products.values()];
};

const assignGuestProductsToAccount = (userId, guestProducts) => {
  if (!guestProducts.length) return true;
  const pendingKey = pendingStorageKey(userId);
  const pending = mergeProducts(readStoredProducts(pendingKey), guestProducts);
  if (!writeStoredProducts(pendingKey, pending)) return false;

  if (typeof window === "undefined") return false;
  try {
    // The owner marker prevents a failed/partial migration from being offered to another account.
    window.localStorage.setItem(GUEST_MIGRATION_OWNER_KEY, String(userId));
  } catch {
    return false;
  }
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // The owner marker already hides this value from future guest/account sessions.
  }
  return true;
};

let wishlistAuthGeneration = 0;

export const useWishlistStore = create((set, get) => ({
  items: [],
  localHydrated: false,
  isAuthenticated: false,
  accountUserId: null,
  isSyncing: false,
  accountSynced: false,
  guestOnlyIds: [],

  initializeLocalWishlist: () => {
    if (get().isAuthenticated) return;
    const items = readGuestProducts();
    set({ items, localHydrated: true, guestOnlyIds: [] });
  },

  isSaved: (productId) => get().items.some((product) => product._id === String(productId)),

  setAuthenticated: async (authenticated, userId = null) => {
    if (!authenticated) {
      wishlistAuthGeneration += 1;
      const guestItems = readGuestProducts();
      set({
        isAuthenticated: false,
        accountUserId: null,
        isSyncing: false,
        accountSynced: false,
        items: guestItems,
        localHydrated: true,
        guestOnlyIds: [],
      });
      return;
    }

    const accountUserId = userId ? String(userId) : "";
    if (!accountUserId) return;
    const current = get();
    if (current.isAuthenticated && current.accountUserId === accountUserId &&
        (current.isSyncing || current.accountSynced)) return;

    const generation = ++wishlistAuthGeneration;
    const guestItems = readGuestProducts();
    const existingPending = readPendingProducts(accountUserId);
    const pendingBeforeSync = mergeProducts(existingPending, guestItems);
    const existingAccountItems = current.isAuthenticated && current.accountUserId === accountUserId
      ? current.items.filter((product) => !current.guestOnlyIds.includes(product._id))
      : [];
    const visibleBeforeSync = mergeProducts(existingAccountItems, pendingBeforeSync);

    set({
      isAuthenticated: true,
      accountUserId,
      isSyncing: true,
      accountSynced: false,
      items: visibleBeforeSync,
      localHydrated: true,
      guestOnlyIds: pendingBeforeSync.map((product) => product._id),
    });

    if (!assignGuestProductsToAccount(accountUserId, guestItems)) {
      set({
        isSyncing: false,
        accountSynced: false,
        items: visibleBeforeSync,
        guestOnlyIds: pendingBeforeSync.map((product) => product._id),
      });
      return;
    }

    try {
      let pending = readPendingProducts(accountUserId);
      for (const product of pending) {
        if (generation !== wishlistAuthGeneration) return;
        try {
          await axios.post("/account/wishlist", { productId: product._id });
          if (generation !== wishlistAuthGeneration) return;
          pending = readPendingProducts(accountUserId).filter((item) => item._id !== product._id);
          writePendingProducts(accountUserId, pending);
        } catch {
          // Keep failed guest imports in this account's own retry queue.
        }
      }

      const { data } = await axios.get("/account/wishlist");
      if (generation !== wishlistAuthGeneration || !get().isAuthenticated ||
          get().accountUserId !== accountUserId) return;

      const serverItems = Array.isArray(data?.products) ? data.products : [];
      const remainingPending = readPendingProducts(accountUserId);
      set({
        items: mergeProducts(serverItems, remainingPending),
        guestOnlyIds: remainingPending.map((product) => product._id),
        isSyncing: false,
        accountSynced: remainingPending.length === 0,
      });
      if (remainingPending.length) {
        toast.error("برخی علاقه‌مندی‌های مهمان هنوز همگام‌سازی نشده‌اند؛ اطلاعات آن‌ها حفظ شده است.");
      }
    } catch (error) {
      if (generation !== wishlistAuthGeneration || !get().isAuthenticated ||
          get().accountUserId !== accountUserId) return;
      const remainingPending = readPendingProducts(accountUserId);
      set({
        items: mergeProducts(existingAccountItems, remainingPending),
        guestOnlyIds: remainingPending.map((product) => product._id),
        isSyncing: false,
        accountSynced: false,
      });
      console.warn("Unable to synchronize account wishlist", error?.message);
    }
  },

  toggleSaved: (product) => {
    if (!product || typeof product._id !== "string") return false;
    const state = get();
    const wasSaved = state.items.some((item) => item._id === product._id);

    if (!state.isAuthenticated || !state.accountUserId) {
      const items = wasSaved
        ? state.items.filter((item) => item._id !== product._id)
        : [product, ...state.items];
      writeGuestProducts(items);
      set({ items, localHydrated: true, guestOnlyIds: [] });
      toast.success(wasSaved ? "از علاقه‌مندی‌ها حذف شد" : "به علاقه‌مندی‌ها اضافه شد");
      return !wasSaved;
    }

    const accountUserId = state.accountUserId;
    const generation = wishlistAuthGeneration;
    const wasGuestOnly = state.guestOnlyIds.includes(product._id);
    const items = wasSaved
      ? state.items.filter((item) => item._id !== product._id)
      : [product, ...state.items];
    set({
      items,
      guestOnlyIds: wasSaved
        ? state.guestOnlyIds.filter((id) => id !== product._id)
        : state.guestOnlyIds,
    });

    const request = wasSaved
      ? axios.delete("/account/wishlist/" + encodeURIComponent(product._id))
      : axios.post("/account/wishlist", { productId: product._id });

    request.then(() => {
      if (generation !== wishlistAuthGeneration || get().accountUserId !== accountUserId) return;
      if (wasSaved) {
        const remaining = readPendingProducts(accountUserId).filter((item) => item._id !== product._id);
        writePendingProducts(accountUserId, remaining);
      }
    }).catch((error) => {
      if (generation === wishlistAuthGeneration && get().isAuthenticated &&
          get().accountUserId === accountUserId) {
        set((current) => ({
          items: wasSaved
            ? mergeProducts([product], current.items)
            : current.items.filter((item) => item._id !== product._id),
          guestOnlyIds: wasSaved && wasGuestOnly && !current.guestOnlyIds.includes(product._id)
            ? [...current.guestOnlyIds, product._id]
            : current.guestOnlyIds,
        }));
      }
      toast.error(error.response?.data?.message || "همگام‌سازی علاقه‌مندی‌ها انجام نشد.");
    });

    toast.success(wasSaved ? "از علاقه‌مندی‌ها حذف شد" : "به علاقه‌مندی‌ها اضافه شد");
    return !wasSaved;
  },

  removeSaved: (productId) => {
    const product = get().items.find((item) => item._id === String(productId));
    if (product) get().toggleSaved(product);
  },

  clearSaved: async () => {
    const state = get();
    if (!state.isAuthenticated || !state.accountUserId) {
      writeGuestProducts([]);
      set({ items: [], localHydrated: true, guestOnlyIds: [] });
      return true;
    }

    const accountUserId = state.accountUserId;
    const generation = ++wishlistAuthGeneration;
    set({ isSyncing: false });
    try {
      await axios.delete("/account/wishlist");
      writePendingProducts(accountUserId, []);
      if (generation === wishlistAuthGeneration && get().accountUserId === accountUserId) {
        set({ items: [], guestOnlyIds: [], accountSynced: true });
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "پاک‌کردن علاقه‌مندی‌ها انجام نشد.");
      return false;
    }
  },
}));
