import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

const getErrorMessage = (error, fallback = "An error occurred") =>
	error.response?.data?.message || error.message || fallback;

export const useCartStore = create((set, get) => ({
	cart: [],
	coupon: null,
	total: 0,
	subtotal: 0,
	isCouponApplied: false,

	getMyCoupon: async () => {
		try {
			const response = await axios.get("/coupons");
			set({ coupon: response.data });
		} catch (error) {
			console.error("Error fetching coupon:", error);
		}
	},

	applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("Coupon applied successfully");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to apply coupon"));
		}
	},

	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("Coupon removed");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");

			if (!Array.isArray(res.data)) {
				throw new Error("Invalid cart response");
			}

			set({ cart: res.data });
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			console.error("Failed to fetch cart:", error);
		}
	},

	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},

	addToCart: async (product) => {
		try {
			await axios.post("/cart", { productId: product._id });
			toast.success("Product added to cart");

			set((prevState) => {
				const existingItem = prevState.cart.find((item) => item._id === product._id);
				const newCart = existingItem
					? prevState.cart.map((item) =>
							item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
					  )
					: [...prevState.cart, { ...product, quantity: 1 }];

				return { cart: newCart };
			});
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	},

	removeFromCart: async (productId) => {
		try {
			await axios.delete("/cart", { data: { productId } });
			set((prevState) => ({
				cart: prevState.cart.filter((item) => item._id !== productId),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to remove item"));
		}
	},

	updateQuantity: async (productId, quantity) => {
		if (quantity === 0) {
			await get().removeFromCart(productId);
			return;
		}

		try {
			await axios.put(`/cart/${productId}`, { quantity });
			set((prevState) => ({
				cart: prevState.cart.map((item) =>
					item._id === productId ? { ...item, quantity } : item
				),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to update quantity"));
		}
	},

	calculateTotals: () => {
		const { cart, coupon } = get();
		const safeCart = Array.isArray(cart) ? cart : [];
		const subtotal = safeCart.reduce(
			(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
			0
		);

		let total = subtotal;

		if (coupon) {
			const discount = subtotal * (Number(coupon.discountPercentage || 0) / 100);
			total = subtotal - discount;
		}

		set({ subtotal, total });
	},
}));
