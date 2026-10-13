import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

const getErrorMessage = (error, fallback = "خطایی رخ داد") =>
	error.response?.data?.message || error.message || fallback;

const cartItemKey = (item) => item.cartItemId ||
	String(item._id) + "::" + encodeURIComponent(item.selectedSize || "") + "::" + encodeURIComponent(item.selectedColor || "");

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
			console.error("خطا در دریافت کد تخفیف:", error);
		}
	},

	applyCoupon: async (code) => {
		try {
			const response = await axios.post("/coupons/validate", { code });
			set({ coupon: response.data, isCouponApplied: true });
			get().calculateTotals();
			toast.success("کد تخفیف با موفقیت اعمال شد");
		} catch (error) {
			toast.error(getErrorMessage(error, "اعمال کد تخفیف ناموفق بود"));
		}
	},

	removeCoupon: () => {
		set({ coupon: null, isCouponApplied: false });
		get().calculateTotals();
		toast.success("کد تخفیف حذف شد");
	},

	getCartItems: async () => {
		try {
			const res = await axios.get("/cart");

			if (!Array.isArray(res.data)) {
				throw new Error("پاسخ سبد خرید نامعتبر است");
			}

			set({ cart: res.data });
			get().calculateTotals();
		} catch (error) {
			set({ cart: [] });
			console.error("دریافت سبد خرید ناموفق بود:", error);
		}
	},

	clearCart: async () => {
		set({ cart: [], coupon: null, total: 0, subtotal: 0 });
	},

	addToCart: async (product, selection = {}) => {
		const size = selection.size || "";
		const color = selection.color || "";
		try {
			await axios.post("/cart", { productId: product._id, size, color });
			toast.success("محصول به سبد خرید اضافه شد");

			set((prevState) => {
				const newItem = {
					...product,
					selectedSize: size,
					selectedColor: color,
					cartItemId: cartItemKey({ _id: product._id, selectedSize: size, selectedColor: color }),
					quantity: 1,
				};
				const key = cartItemKey(newItem);
				const existingItem = prevState.cart.find((item) => cartItemKey(item) === key);
				const newCart = existingItem
					? prevState.cart.map((item) =>
							cartItemKey(item) === key ? { ...item, quantity: item.quantity + 1 } : item
					  )
					: [...prevState.cart, newItem];

				return { cart: newCart };
			});
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	},

	removeFromCart: async (itemOrId) => {
		const isItem = itemOrId && typeof itemOrId === "object";
		const productId = isItem ? itemOrId._id : itemOrId;
		const size = isItem ? itemOrId.selectedSize || "" : "";
		const color = isItem ? itemOrId.selectedColor || "" : "";
		try {
			await axios.delete("/cart", { data: isItem ? { productId, size, color } : { productId } });
			set((prevState) => ({
				cart: prevState.cart.filter((item) => isItem
					? cartItemKey(item) !== cartItemKey(itemOrId)
					: item._id !== productId),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error, "حذف کالا ناموفق بود"));
		}
	},

	updateQuantity: async (itemOrId, quantity) => {
		const isItem = itemOrId && typeof itemOrId === "object";
		const productId = isItem ? itemOrId._id : itemOrId;
		if (quantity === 0) {
			await get().removeFromCart(itemOrId);
			return;
		}

		const size = isItem ? itemOrId.selectedSize || "" : "";
		const color = isItem ? itemOrId.selectedColor || "" : "";
		try {
			await axios.put("/cart/" + productId, { quantity, size, color });
			set((prevState) => ({
				cart: prevState.cart.map((item) =>
					(isItem ? cartItemKey(item) === cartItemKey(itemOrId) : item._id === productId)
						? { ...item, quantity }
						: item
				),
			}));
			get().calculateTotals();
		} catch (error) {
			toast.error(getErrorMessage(error, "به‌روزرسانی تعداد ناموفق بود"));
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
