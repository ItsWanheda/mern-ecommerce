import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCartStore } from "../stores/useCartStore";

const GiftCouponCard = () => {
	const [userInputCode, setUserInputCode] = useState("");
	const { coupon, isCouponApplied, applyCoupon, getMyCoupon, removeCoupon } = useCartStore();

	useEffect(() => {
		getMyCoupon();
	}, [getMyCoupon]);

	useEffect(() => {
		if (coupon) setUserInputCode(coupon.code);
	}, [coupon]);

	const handleApplyCoupon = () => {
		if (!userInputCode) return;
		applyCoupon(userInputCode);
	};

	const handleRemoveCoupon = async () => {
		await removeCoupon();
		setUserInputCode("");
	};

	return (
		<motion.div
			className='space-y-4 rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 shadow-sm sm:p-6'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.2 }}
		>
			<div className='space-y-4'>
				<div>
					<label htmlFor='voucher' className='mb-2 block text-sm font-semibold text-[#41443b]'>
						کد تخفیف یا کارت هدیه دارید؟
					</label>
					<input
						type='text'
						id='voucher'
						className='block w-full min-h-12 rounded-xl border border-[#d5d0c5] bg-white 
            p-3 text-sm text-[#252722] placeholder-[#707267] focus:border-[#68745f] 
            focus:ring-[#68745f]/20'
						placeholder='کد را اینجا وارد کنید'
						value={userInputCode}
						onChange={(e) => setUserInputCode(e.target.value)}
						required
					/>
				</div>

				<motion.button
					type='button'
					className='flex w-full items-center justify-center min-h-12 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus:outline-none focus:ring-4 focus:ring-[#68745f]/30'
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={handleApplyCoupon}
				>
					اعمال کد
				</motion.button>
			</div>
			{isCouponApplied && coupon && (
				<div className='mt-4'>
					<h3 className='text-base font-semibold text-[#41443b]'>کد تخفیف اعمال‌شده</h3>

					<p className='mt-2 text-sm text-[#55584f]'>
						{coupon.code} - {coupon.discountPercentage}٪ تخفیف
					</p>

					<motion.button
						type='button'
						className='mt-2 flex w-full items-center justify-center min-h-11 rounded-full bg-[#fff0ee] 
            px-5 py-2.5 text-sm font-semibold text-[#8b3d34] transition hover:bg-[#fbe2de] focus:outline-none
             focus:ring-4 focus:ring-red-200'
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleRemoveCoupon}
					>
						حذف کد تخفیف
					</motion.button>
				</div>
			)}

			{coupon && (
				<div className='mt-4'>
					<h3 className='text-lg font-medium text-gray-300'>کد تخفیف در دسترس شما:</h3>
					<p className='mt-2 text-sm text-gray-400'>
						{coupon.code} - {coupon.discountPercentage}٪ تخفیف
					</p>
				</div>
			)}
		</motion.div>
	);
};
export default GiftCouponCard;
