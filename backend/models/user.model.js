import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const defaultShippingAddressSchema = new mongoose.Schema({
 recipientName: { type: String, trim: true, minlength: 2, maxlength: 100, required: true },
 phone: { type: String, trim: true, match: /^09\d{9}$/, required: true },
 province: { type: String, trim: true, maxlength: 80, required: true },
 city: { type: String, trim: true, minlength: 2, maxlength: 80, required: true },
 district: { type: String, trim: true, maxlength: 80, default: "" },
 addressLine: { type: String, trim: true, minlength: 10, maxlength: 500, required: true },
 postalCode: { type: String, trim: true, match: /^\d{10}$/, required: true },
 notes: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: false });

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
			minlength: [6, "Password must be at least 6 characters long"],
		},
		passwordResetTokenHash: { type: String, select: false },
		passwordResetExpiresAt: { type: Date, select: false },
    defaultShippingAddress: { type: defaultShippingAddressSchema, default: undefined },
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
