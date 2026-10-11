import app from "../app.js";
import { connectDB } from "../lib/db.js";

export default async function handler(req, res) {
	try {
		await connectDB();
		return app(req, res);
	} catch (error) {
		console.error("API initialization failed:", error);
		return res.status(500).json({ message: "Database connection failed" });
	}
}
