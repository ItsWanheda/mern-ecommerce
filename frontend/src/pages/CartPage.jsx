import { Link } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import CartItem from "../components/CartItem";
import PeopleAlsoBought from "../components/PeopleAlsoBought";
import OrderSummary from "../components/OrderSummary";
import GiftCouponCard from "../components/GiftCouponCard";

const CartPage = () => {
  const { cart } = useCartStore();
  return (
    <main dir="rtl" className="min-h-[65vh] bg-[#f7f5f0] px-3 py-7 text-[#252722] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 border-b border-[#e4e0d8] pb-5 sm:mb-8 sm:pb-6"><p className="text-xs font-semibold tracking-[0.16em] text-[#68745f]">انتخاب‌های شما</p><h1 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">سبد خرید</h1><p className="mt-2 text-sm leading-6 text-[#55584f]">پیش از پرداخت، تعداد کالاها و خلاصه مبلغ سفارش را بررسی کنید.</p></header>
        <div className="md:gap-6 lg:flex lg:items-start xl:gap-8">
          <motion.div className="mx-auto w-full flex-none lg:max-w-2xl xl:max-w-4xl" initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{duration:0.5,delay:0.1}}>
            {cart.length === 0 ? <EmptyCartUI /> : <div className="space-y-4 sm:space-y-5">{cart.map((item)=><CartItem key={item._id} item={item}/>)}</div>}
            {cart.length > 0 && <PeopleAlsoBought />}
          </motion.div>
          {cart.length > 0 && <motion.div className="mx-auto mt-5 max-w-4xl flex-1 space-y-4 lg:mt-0 lg:w-full" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{duration:0.5,delay:0.2}}><OrderSummary/><GiftCouponCard/></motion.div>}
        </div>
      </div>
    </main>
  );
};
export default CartPage;

const EmptyCartUI = () => (
  <motion.section className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#d5d0c5] bg-[#fffefa] px-5 py-16 text-center" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
    <ShoppingCart className="h-16 w-16 text-[#68745f]" aria-hidden="true"/>
    <h2 className="mt-4 font-serif text-2xl font-medium text-[#252722]">سبد خرید شما خالی است</h2>
    <p className="mt-2 text-sm leading-6 text-[#55584f]">هنوز محصولی به سبد خرید خود اضافه نکرده‌اید.</p>
    <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#252722] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#41443b]" to="/shop">شروع خرید <ArrowLeft size={16} aria-hidden="true"/></Link>
  </motion.section>
);
