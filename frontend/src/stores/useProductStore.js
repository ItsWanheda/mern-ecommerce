import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

export const useProductStore = create((set) => ({
  products: [],
  priceBounds: null,
  featuredProducts: [],
  newestProducts: [],
  loading: false,
  setProducts: (products) => set({ products, priceBounds: null }),

  createProduct: async (productData) => {
    set({ loading: true });
    try {
      const res = await axios.post("/products", productData);
      set((state) => ({ products: [...state.products, res.data], loading: false }));
      toast.success("محصول ایجاد شد");
      return res.data;
    } catch (error) {
      toast.error(getErrorMessage(error, "ایجاد محصول ناموفق بود"));
      set({ loading: false });
      throw error;
    }
  },

  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/products");
      set({ products: response.data.products, priceBounds: null, loading: false });
    } catch (error) {
      set({ error: "دریافت محصولات ناموفق بود", loading: false });
      toast.error(getErrorMessage(error, "دریافت محصولات ناموفق بود"));
    }
  },

  fetchProductsByCategory: async (category) => {
    set({ loading: true, products: [], priceBounds: null });
    try {
      const response = await axios.get(`/products/category/${encodeURIComponent(category)}`);
      set({
        products: Array.isArray(response.data.products) ? response.data.products : [],
        priceBounds: response.data.priceBounds || null,
        loading: false,
      });
    } catch (error) {
      set({ error: "دریافت محصولات ناموفق بود", priceBounds: null, loading: false });
      toast.error(getErrorMessage(error, "دریافت محصولات ناموفق بود"));
    }
  },
  fetchNewestProducts: async () => {
    try {
      const response = await axios.get("/products/newest?limit=8");
      set({ newestProducts: response.data.products || [] });
    } catch (error) {
      console.error("Error fetching newest products:", error.message);
    }
  },

  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      await axios.delete(`/products/${productId}`);
      set((state) => ({
        products: state.products.filter((product) => product._id !== productId),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
      toast.error(getErrorMessage(error, "حذف محصول ناموفق بود"));
    }
  },

  updateProductStock: async (productId, stock) => {
    try {
      const response = await axios.patch(`/products/${productId}/stock`, { stock });
      set((state) => ({
        products: state.products.map((product) => product._id === productId ? { ...product, stock: response.data.stock } : product),
      }));
      toast.success("موجودی به‌روزرسانی شد");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "به‌روزرسانی موجودی ناموفق بود"));
      return false;
    }
  },


  updateProductVariantStock: async (productId, size, color, stock) => {
    try {
      const response = await axios.patch(`/products/${productId}/variant-stock`, { size, color, stock });
      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId ? { ...product, variants: response.data.variants } : product
        ),
      }));
      toast.success("موجودی این گزینه به‌روزرسانی شد");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "به‌روزرسانی موجودی گزینه ناموفق بود"));
      return false;
    }
  },

  toggleFeaturedProduct: async (productId) => {
    set({ loading: true });
    try {
      const response = await axios.patch(`/products/${productId}`);
      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId ? { ...product, isFeatured: response.data.isFeatured } : product
        ),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false });
      toast.error(getErrorMessage(error, "به‌روزرسانی محصول ناموفق بود"));
    }
  },

  fetchFeaturedProducts: async () => {
    try {
      const response = await axios.get("/products/featured");
      set({ featuredProducts: response.data || [] });
    } catch (error) {
      console.error("Error fetching featured products:", error.message);
    }
  },
}));
