import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "../lib/password-reset-email.js";

const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m",
	});

	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d",
	});

	return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7days
};

const setCookies = (res, accessToken, refreshToken) => {
	res.cookie("accessToken", accessToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
};

export const signup = async (req, res) => {
	const { email, password, name } = req.body;
	try {
		const userExists = await User.findOne({ email });

		if (userExists) {
			return res.status(400).json({ message: "User already exists" });
		}
		const user = await User.create({ name, email, password });

		// authenticate
		const { accessToken, refreshToken } = generateTokens(user._id);
		await storeRefreshToken(user._id, refreshToken);

		setCookies(res, accessToken, refreshToken);

		res.status(201).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
      defaultShippingAddress: user.defaultShippingAddress,
		});
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ message: error.message });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });

		if (user && (await user.comparePassword(password))) {
			const { accessToken, refreshToken } = generateTokens(user._id);
			await storeRefreshToken(user._id, refreshToken);
			setCookies(res, accessToken, refreshToken);

			res.json({
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			});
		} else {
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ message: error.message });
	}
};

const genericRecoveryMessage = "اگر این ایمیل در فروشگاه ثبت شده باشد، راهنمای بازیابی رمز عبور ارسال می‌شود.";

const normalizeAddressDigits = value => String(value ?? "")
 .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
 .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
const normalizeAddressPhone = value => {
 let phone = normalizeAddressDigits(value).replace(/\D/g, "");
 if (phone.startsWith("0098") && phone.length === 14) phone = "0" + phone.slice(4);
 else if (phone.startsWith("98") && phone.length === 12) phone = "0" + phone.slice(2);
 else if (phone.length === 10 && phone.startsWith("9")) phone = "0" + phone;
 return phone;
};
export const saveDefaultAddress = async (req, res) => {
 const input = req.body?.shippingAddress;
 if (!input || typeof input !== "object" || Array.isArray(input)) return res.status(400).json({ message: "اطلاعات نشانی معتبر نیست." });
 const address = {
  recipientName: typeof input.recipientName === "string" ? input.recipientName.trim() : "",
  phone: normalizeAddressPhone(input.phone),
  province: typeof input.province === "string" ? input.province.trim() : "",
  city: typeof input.city === "string" ? input.city.trim() : "",
  district: typeof input.district === "string" ? input.district.trim() : "",
  addressLine: typeof input.addressLine === "string" ? input.addressLine.trim() : "",
  postalCode: normalizeAddressDigits(input.postalCode).replace(/\D/g, ""),
  notes: typeof input.notes === "string" ? input.notes.trim() : "",
 };
 const fieldErrors = {};
 if (address.recipientName.length < 2 || address.recipientName.length > 100) fieldErrors.recipientName = "نام گیرنده باید بین ۲ تا ۱۰۰ نویسه باشد.";
 if (!/^09\d{9}$/.test(address.phone)) fieldErrors.phone = "شماره موبایل باید با 09 شروع شود و ۱۱ رقم داشته باشد.";
 if (!address.province || address.province.length > 80) fieldErrors.province = "استان را انتخاب کنید.";
 if (address.city.length < 2 || address.city.length > 80) fieldErrors.city = "نام شهر را کامل وارد کنید.";
 if (address.district.length > 80) fieldErrors.district = "نام محله بیش از حد طولانی است.";
 if (address.addressLine.length < 10 || address.addressLine.length > 500) fieldErrors.addressLine = "نشانی باید بین ۱۰ تا ۵۰۰ نویسه باشد.";
 if (!/^\d{10}$/.test(address.postalCode)) fieldErrors.postalCode = "کد پستی باید ۱۰ رقم داشته باشد.";
 if (address.notes.length > 500) fieldErrors.notes = "توضیحات بیش از حد طولانی است.";
 if (Object.keys(fieldErrors).length) return res.status(400).json({ message: "اطلاعات نشانی را بررسی کنید.", fieldErrors });
 try {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "حساب کاربری پیدا نشد." });
  user.defaultShippingAddress = address;
  await user.save();
  return res.json({ defaultShippingAddress: user.defaultShippingAddress });
 } catch (error) {
  console.error("Saving default delivery address failed", error.message);
  return res.status(500).json({ message: "ذخیره نشانی پیش‌فرض ناموفق بود." });
 }
};

export const forgotPassword = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "ایمیل معتبر وارد کنید." });
  }
  if (!isPasswordResetEmailConfigured()) {
    return res.status(503).json({ message: "بازیابی رمز عبور هنوز در این محیط پیکربندی نشده است." });
  }
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      try {
        await sendPasswordResetEmail(email, token);
      } catch (mailError) {
        // Never let a provider failure reveal whether an account exists. Remove the
        // unused token and log provider failure for the operator to investigate.
        user.passwordResetTokenHash = undefined;
        user.passwordResetExpiresAt = undefined;
        await user.save();
        console.error("Unable to send password recovery email", mailError.message);
      }
    }
    return res.json({ message: genericRecoveryMessage });
  } catch (error) {
    console.error("Password recovery request failed", error.message);
    return res.status(500).json({ message: "درخواست بازیابی رمز عبور انجام نشد." });
  }
};

export const resetPassword = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: "لینک بازیابی نامعتبر یا منقضی شده است." });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ message: "رمز عبور باید دست‌کم ۸ نویسه داشته باشد." });
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ message: "لینک بازیابی نامعتبر یا منقضی شده است." });
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await redis.del("refresh_token:" + user._id);
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.json({ message: "رمز عبور تغییر کرد؛ اکنون وارد حساب شوید." });
  } catch (error) {
    console.error("Password reset failed", error.message);
    return res.status(500).json({ message: "تغییر رمز عبور ناموفق بود." });
  }
};

export const logout = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;
		if (refreshToken) {
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			await redis.del(`refresh_token:${decoded.userId}`);
		}

		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");
		res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// this will refresh the access token
export const refreshToken = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			return res.status(401).json({ message: "No refresh token provided" });
		}

		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

		if (storedToken !== refreshToken) {
			return res.status(401).json({ message: "Invalid refresh token" });
		}

		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 15 * 60 * 1000,
		});

		res.json({ message: "Token refreshed successfully" });
	} catch (error) {
		console.log("Error in refreshToken controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const getProfile = async (req, res) => {
	try {
		res.json(req.user);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
