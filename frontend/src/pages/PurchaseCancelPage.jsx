import { XCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PurchaseCancelPage = () => {
	return (
		<div className='min-h-[70vh] flex items-center justify-center bg-[#f7f5f0] px-4 py-12'>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className='max-w-md w-full bg-[#fffefa] border border-[#e4e0d8] rounded-3xl shadow-sm overflow-hidden relative z-10'
			>
				<div className='p-6 sm:p-8'>
					<div className='flex justify-center'>
						<XCircle className='text-[#8b3d34] w-16 h-16 mb-4' />
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-center text-red-500 mb-2'>خرید لغو شد</h1>
					<p className='text-[#55584f] text-center mb-6'>
						سفارش شما لغو شده است و مبلغی از حساب شما کسر نشده است.
					</p>
					<div className='bg-[#f7f5f0] border border-[#e4e0d8] rounded-xl p-4 mb-6'>
						<p className='text-sm leading-6 text-[#55584f] text-center'>
							اگر هنگام پرداخت با مشکلی روبه‌رو شدید، با تیم پشتیبانی ما
							تماس بگیرید.
						</p>
					</div>
					<div className='space-y-4'>
						<Link
							to={"/"}
							className='w-full min-h-12 bg-[#252722] hover:bg-[#41443b] text-white font-semibold py-3 px-4 rounded-full transition duration-300 flex items-center justify-center'
						>
							<ArrowLeft className='mr-2' size={18} />
							بازگشت به فروشگاه
						</Link>
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default PurchaseCancelPage;
