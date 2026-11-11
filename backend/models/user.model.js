import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getPasswordPolicyError } from "../lib/password-policy.js";

const shippingAddressFields = {
 recipientName: { type: String, trim: true, minlength: 2, maxlength: 100, required: true },
 phone: { type: String, trim: true, match: /^09\d{9}$/, required: true },
 province: { type: String, trim: true, maxlength: 80, required: true },
 city: { type: String, trim: true, minlength: 2, maxlength: 80, required: true },
 district: { type: String, trim: true, maxlength: 80, default: "" },
 addressLine: { type: String, trim: true, minlength: 10, maxlength: 500, required: true },
 postalCode: { type: String, trim: true, match: /^\d{10}$/, required: true },
 notes: { type: String, trim: true, maxlength: 500, default: "" },
};

const defaultShippingAddressSchema = new mongoose.Schema(shippingAddressFields, { _id: false });
const savedShippingAddressSchema = new mongoose.Schema({
 label: { type: String, trim: true, minlength: 2, maxlength: 60, default: "نشانی من" },
 ...shippingAddressFields,
 isDefault: { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [12, "Password must be at least 12 characters long"],
			validate: {
				validator(value) {
					return !this.isModified("password") || getPasswordPolicyError(value) === "";
				},
				message: (props) => getPasswordPolicyError(props.value) || "Password does not meet the required strength policy",
			},
		},
		passwordResetTokenHash: { type: String, select: false },
		passwordResetExpiresAt: { type: Date, select: false },
    defaultShippingAddress: { type: defaultShippingAddressSchema, default: undefined },
    savedShippingAddresses: { type: [savedShippingAddressSchema], default: [] },
		cartItems: [
			{
				quantity: {
					type: Number,
					default: 1,
				},
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "Product",
				},
				size: { type: String, trim: true, default: "" },
				color: { type: String, trim: true, default: "" },
			},
		],
		role: {
			type: String,
			enum: ["customer", "admin"],
			default: "customer",
		},
    // Undefined preserves legacy administrator access until permissions are configured.
    permissions: {
      type: [{ type: String, enum: ["catalogue.manage", "orders.manage", "customers.manage", "support.manage", "reports.view", "settings.manage", "inventory.manage", "audit.view", "system.view", "roles.manage", "marketing.manage", "*"] }],
      default: undefined,
    },
    isActive: { type: Boolean, default: true },
    primaryPhone: { type: String, trim: true, default: "", validate: { validator: value => !value || /^09\\d{9}$/.test(value), message: "Primary phone must be an Iranian mobile number" } },
    phoneVerifiedAt: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    pendingEmail: { type: String, lowercase: true, trim: true, default: "" },
    emailChangeTokenHash: { type: String, select: false },
    emailChangeExpiresAt: { type: Date, select: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    communicationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      productNews: { type: Boolean, default: false },
      promotionalEmails: { type: Boolean, default: false },
    },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false, default: "" },
    deletionRequestedAt: { type: Date, default: null },
	},
	{
		timestamps: true,
	}
);

// Pre-save hook to hash password before saving to database
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	try {
		const salt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (error) {
		next(error);
	}
});

userSchema.methods.comparePassword = async function (password) {
	return bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
