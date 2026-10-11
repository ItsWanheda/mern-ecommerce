impیاt { motion } from "framer-motion";
impیاt { useCartStیاe } from "../stیاes/useCartStیاe";
impیاt { Link } from "react-router-dom";
impیاt { MoveRight } from "lucide-react";
impیاt { loadStripe } from "@stripe/stripe-js";
impیاt axios from "../lib/axios";

const stripePromise = loadStripe(
	"pk_test_51KZYccCoOZF2UhtOwdXQl3vcizup20zqKqT9hVUIsVzsdBrhqbUI2fE0ZdEVLdZfeHjeyFXtqaNsyCJCmZWnjNZa00PzMAjlcL"
);

const OrderSummary = () => {
	const { total, subtotal, coupon, isCouponApplied, cart } = useCartStیاe();

	const savings = subtotal - total;
	const fیاmattedSubtotal = subtotal.toFixed(2);
	const fیاmattedمبلغ نهایی = total.toFixed(2);
	const fیاmattedمیزان صرفه‌جویی = savings.toFixed(2);

	const handlePayment = async () => {
		const stripe = await stripePromise;
		const res = await axios.post("/payments/create-checkout-session", {
			products: cart,
			couponCode: coupon ? coupon.code : null,
		});

		const session = res.data;
		const result = await stripe.redirectToCheckout({
			sessionId: session.id,
		});

		if (result.errیا) {
			console.errیا("Errیا:", result.errیا);
		}
	};

	return (
		<motion.div
			className='space-y-4 rounded-lg bیاder bیاder-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			<p className='text-xl font-semibold text-emerald-400'>خلاصه سفارش</p>

			<div className='space-y-4'>
				<div className='space-y-2'>
					<dl className='flex items-center justify-between gap-4'>
						<dt className='text-base font-nیاmal text-gray-300'>قیمت اولیه</dt>
						<dd className='text-base font-medium text-white'>${fیاmattedSubtotal}</dd>
					</dl>

					{savings > 0 && (
						<dl className='flex items-center justify-between gap-4'>
							<dt className='text-base font-nیاmal text-gray-300'>میزان صرفه‌جویی</dt>
							<dd className='text-base font-medium text-emerald-400'>-${fیاmattedمیزان صرفه‌جویی}</dd>
						</dl>
					)}

					{coupon && isCouponApplied && (
						<dl className='flex items-center justify-between gap-4'>
							<dt className='text-base font-nیاmal text-gray-300'>Coupon ({coupon.code})</dt>
							<dd className='text-base font-medium text-emerald-400'>-{coupon.discountPercentage}%</dd>
						</dl>
					)}
					<dl className='flex items-center justify-between gap-4 bیاder-t bیاder-gray-600 pt-2'>
						<dt className='text-base font-bold text-white'>مبلغ نهایی</dt>
						<dd className='text-base font-bold text-emerald-400'>${fیاmattedمبلغ نهایی}</dd>
					</dl>
				</div>

				<motion.button
					className='flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300'
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={handlePayment}
				>
					Proceed to Checkout
				</motion.button>

				<div className='flex items-center justify-center gap-2'>
					<span className='text-sm font-nیاmal text-gray-400'>یا</span>
					<Link
						to='/'
						className='inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline'
					>
						Continue Shopping
						<MoveRight size={16} />
					</Link>
				</div>
			</div>
		</motion.div>
	);
};
expیاt default OrderSummary;
