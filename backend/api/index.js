import app from "../app.js";
import { connectDB } from "../lib/db.js";

export default async function handler(req, res) {
	try {
		await connectDB();
		return app(req, res);
	} catch (error) {
		console.error("API initialization failed", { name: error?.name, message: error?.message });
		return res.status(503).json({ message: "Service temporarily unavailable" });
	}
}
