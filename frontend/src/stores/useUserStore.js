import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

const getErrorMessage = (error, fallback = "An error occurred") =>
	error.response?.data?.message || error.message || fallback;

export const useUserStore = create((set, get) => ({
	user: null,
	loading: false,
	checkingAuth: true,

	signup: async ({ name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			return toast.error("Passwords do not match");
		}

		try {
			const res = await axios.post("/auth/signup", { name, email, password });
			set({ user: res.data, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(getErrorMessage(error));
		}
	},

	login: async (email, password) => {
		set({ loading: true });

		try {
			const res = await axios.post("/auth/login", { email, password });
			set({ user: res.data, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(getErrorMessage(error));
		}
	},

	logout: async () => {
		try {
			await axios.post("/auth/logout");
		} catch (error) {
			console.error("Logout request failed:", error);
		} finally {
			set({ user: null });
		}
	},

	checkAuth: async () => {
		set({ checkingAuth: true });

		try {
			const response = await axios.get("/auth/profile");

			if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
				throw new Error("Invalid authentication response");
			}

			set({ user: response.data, checkingAuth: false });
		} catch (error) {
			console.error("Authentication check failed:", error);
			set({ checkingAuth: false, user: null });
		}
	},

	refreshToken: async () => {
		if (get().checkingAuth) return;

		set({ checkingAuth: true });

		try {
			const response = await axios.post("/auth/refresh-token");
			set({ checkingAuth: false });
			return response.data;
		} catch (error) {
			set({ user: null, checkingAuth: false });
			throw error;
		}
	},
}));

let refreshPromise = null;

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		try {
			if (!refreshPromise) {
				refreshPromise = useUserStore.getState().refreshToken();
			}

			await refreshPromise;
			return axios(originalRequest);
		} catch (refreshError) {
			useUserStore.getState().logout();
			return Promise.reject(refreshError);
		} finally {
			refreshPromise = null;
		}
	}
);
