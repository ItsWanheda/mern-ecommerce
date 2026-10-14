import { XCircle, ArrowLeft, Clock3 } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";

const PurchaseCancelPage = () => {
  const [searchParams] = useSearchParams();
  const verificationPending = searchParams.get("reason") === "verification-pending";
  const orderId = searchParams.get("order_id");
  const StatusIcon = verificationPending ? Clock3 : XCircle;

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='max-w-md w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden relative z-10'
      >
        <div className='p-6 sm:p-8'>
          <div className='flex justify-center'>
            <StatusIcon
              className={`${verificationPending ? "text-amber-400" : "text-red-500"} w-16 h-16 mb-4`}
            />
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold text-center mb-2 ${verificationPending ? "text-amber-400" : "text-red-500"}`}>
            {verificationPending ? "وضعیت پرداخت در حال بررسی است" : "خرید لغو شد"}
          </h1>
          <p className='text-gray-300 text-center mb-6'>
            {verificationPending
              ? "درگاه پرداخت هنوز نتیجه نهایی را تأیید نکرده است. ممکن است تراکنش شما تکمیل شده باشد؛ فعلاً دوباره پرداخت نکنید."
              : "سفارش شما لغو شده است و مبلغی از حساب شما کسر نشده است."}
          </p>
          {verificationPending && orderId && (
            <div className='bg-gray-700 rounded-lg p-4 mb-6'>
              <p className='text-sm text-gray-400 text-center mb-1'>شماره سفارش برای پیگیری</p>
              <p className='text-sm text-gray-100 text-center break-all' dir='ltr'>{orderId}</p>
            </div>
          )}
          <div className='bg-gray-700 rounded-lg p-4 mb-6'>
            <p className='text-sm text-gray-400 text-center'>
              {verificationPending
                ? "وضعیت پرداخت در حال بررسی مجدد است. اگر وضعیت سفارش مشخص نشد، شماره سفارش را به پشتیبانی ارائه دهید."
                : "اگر هنگام پرداخت با مشکلی روبه‌رو شدید، با تیم پشتیبانی ما تماس بگیرید."}
            </p>
          </div>
          <div className='space-y-4'>
            <Link
              to={"/"}
              className='w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center'
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
