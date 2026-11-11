import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const STORAGE_KEY = "tik-boutique-saved-products";
const readSavedProducts = () => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(product => product && typeof product._id === "string") : [];
  } catch { return []; }
};
const persistSavedProducts = items => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch { toast.error("ذخیره علاقه‌مندی‌ها در این مرورگر امکان‌پذیر نیست"); }
};

export const useWishlistStore = create((set, get) => ({
  items: readSavedProducts(),
  isAuthenticated: false,
  isSyncing: false,

  isSaved: productId => get().items.some(product => product._id === productId),

  setAuthenticated: async authenticated => {
    if (!authenticated) { set({ isAuthenticated: false }); return; }
    if (get().isAuthenticated || get().isSyncing) return;
    set({ isAuthenticated: true, isSyncing: true });
    try {
      const localItems = get().items;
      for (const product of localItems) {
        await axios.post("/account/wishlist", { productId: product._id }).catch(() => {});
      }
      const { data } = await axios.get("/account/wishlist");
      const items = Array.isArray(data.products) ? data.products : [];
      persistSavedProducts(items);
      set({ items });
    } catch (error) {
      set({ isAuthenticated: false });
      console.warn("Unable to synchronize account wishlist", error?.message);
    } finally { set({ isSyncing: false }); }
  },

  toggleSaved: product => {
    if (!product || typeof product._id !== "string") return false;
    const wasSaved = get().items.some(item => item._id === product._id);
    const items = wasSaved ? get().items.filter(item => item._id !== product._id) : [product, ...get().items];
    persistSavedProducts(items);
    set({ items });
    if (get().isAuthenticated) {
      const request = wasSaved
        ? axios.delete("/account/wishlist/" + encodeURIComponent(product._id))
        : axios.post("/account/wishlist", { productId: product._id });
      request.catch(error => {
        set(state => {
          const restored = wasSaved ? [product, ...state.items] : state.items.filter(item => item._id !== product._id);
          persistSavedProducts(restored);
          return { items: restored };
        });
        toast.error(error.response?.data?.message || "همگام‌سازی علاقه‌مندی‌ها انجام نشد.");
      });
    }
    toast.success(wasSaved ? "از علاقه‌مندی‌ها حذف شد" : "به علاقه‌مندی‌ها اضافه شد");
    return !wasSaved;
  },

  removeSaved: productId => {
    const items = get().items.filter(product => product._id !== productId);
    persistSavedProducts(items); set({ items });
    if (get().isAuthenticated) void axios.delete("/account/wishlist/" + encodeURIComponent(productId)).catch(() => {});
  },

  clearSaved: () => {
    persistSavedProducts([]); set({ items: [] });
    if (get().isAuthenticated) void axios.delete("/account/wishlist").catch(() => {});
  },
}));
