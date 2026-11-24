import { create } from "zustand";
import axios from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { createRefreshCoordinator, shouldAttemptTokenRefresh } from "../lib/refresh-coordinator.js";

const getErrorMessage = (error, fallback = "خطایی رخ داد") =>
	error.response?.data?.message || error.message || fallback;

let authCheckPromise = null;

export const useUserStore = create((set) => ({
	user: null,
	loading: false,
	checkingAuth: true,
	authInitialized: false,

	signup: async ({ name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			return toast.error("رمزهای عبور یکسان نیستند");
		}

		try {
			const res = await axios.post("/auth/signup", { name, email, password });
			set({ user: res.data, loading: false, authInitialized: true });
		} catch (error) {
			set({ loading: false });
			toast.error(getErrorMessage(error));
		}
	},

	login: async (email, password, code) => {
		set({ loading: true });
		try {
			const res = await axios.post("/auth/login", { email, password, ...(code ? { code } : {}) });
			set({ user: res.data, loading: false, authInitialized: true });
			return { success: true };
		} catch (error) {
			set({ loading: false });
			toast.error(getErrorMessage(error));
			return { success: false, twoFactorRequired: Boolean(error.response?.data?.twoFactorRequired) };
		}
	},

	logout: async () => {
		try {
			await axios.post("/auth/logout");
		} catch (error) {
			console.error("درخواست خروج ناموفق بود:", error);
		} finally {
			set({ user: null, authInitialized: true });
		}
	},

	checkAuth: async () => {
		if (useUserStore.getState().authInitialized) return useUserStore.getState().user;
		if (authCheckPromise) return authCheckPromise;

		set({ checkingAuth: true });
		authCheckPromise = (async () => {
			try {
				const response = await axios.get("/auth/profile");

				if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
					throw new Error("پاسخ احراز هویت نامعتبر است");
				}

				set({ user: response.data, checkingAuth: false, authInitialized: true });
				return response.data;
			} catch (error) {
				if (error.response?.status !== 401) {
					console.error("بررسی احراز هویت ناموفق بود:", error);
				}
				set({ checkingAuth: false, user: null, authInitialized: true });
				return null;
			} finally {
				authCheckPromise = null;
			}
		})();
		return authCheckPromise;
	},

	// Re-read the current account even after the initial auth check. This keeps role
	// changes made by an administrator in sync without requiring a new login.
	refreshUser: async () => {
		try {
			const response = await axios.get("/auth/profile");
			if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
				throw new Error("پاسخ پروفایل نامعتبر است");
			}
			set({ user: response.data, authInitialized: true, checkingAuth: false });
			return response.data;
		} catch (error) {
			set({ checkingAuth: false });
			throw error;
		}
	},

	updateProfile: async (name) => {
		const response = await axios.patch("/auth/profile", { name });
		const updatedUser = response.data?.user;
		if (updatedUser) set((state) => ({ user: state.user ? { ...state.user, ...updatedUser } : updatedUser }));
		return updatedUser;
	},

	refreshToken: async () => {
		set({ checkingAuth: true });

		try {
			const response = await axios.post("/auth/refresh-token");
			set({ checkingAuth: false });
			return response.data;
		} catch (error) {
			if (error.response?.status === 401) {
				set({ user: null, checkingAuth: false, authInitialized: true });
			} else {
				set({ checkingAuth: false });
			}
			throw error;
		}
	},
}));

const refreshSessionOnce = createRefreshCoordinator(
	() => useUserStore.getState().refreshToken()
);

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;
		if (!shouldAttemptTokenRefresh(error)) return Promise.reject(error);

		originalRequest._retry = true;

		try {
			await refreshSessionOnce();
			return axios(originalRequest);
		} catch (refreshError) {
			// A 401 means there is no valid refresh session (normal for signed-out visitors).
			// The backend clears stale cookies; avoid sending a redundant logout request.
			// Temporary failures such as 503 must not silently sign out an existing user.
			return Promise.reject(refreshError?.response?.status === 401 ? error : refreshError);
		}
	}
);
