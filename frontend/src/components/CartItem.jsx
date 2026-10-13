import { Minus, Plus, Trash } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import { formatPrice, isStockTracked } from "../lib/commerce";

const CartItem = ({ item }) => {
  const { removeFromCart, updateQuantity } = useCartStore();
  const maxReached = isStockTracked(item) && item.quantity >= item.stock;

  return (
    <div dir="rtl" className="rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 shadow-sm transition hover:border-[#d5d0c5] md:p-5">
      <div className="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0">
        <div className="shrink-0 md:order-1">
          <img className="h-24 w-20 rounded-xl bg-[#f0eee8] object-cover sm:h-28 sm:w-24 md:h-32 md:w-28" src={item.image} alt={item.name} />
        </div>
        <div className="flex items-center justify-between md:order-3 md:justify-end">
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d5d0c5] bg-[#fffefa] text-[#41443b] transition hover:bg-[#e9ede4] focus:outline-none focus:ring-2 focus:ring-[#68745f]" aria-label="کاهش تعداد" onClick={() => updateQuantity(item._id, item.quantity - 1)}>
              <Minus className="text-[#41443b]" aria-hidden="true" />
            </button>
            <p className="min-w-5 text-center tabular-nums">{new Intl.NumberFormat("fa-IR").format(item.quantity)}</p>
            <button type="button" disabled={maxReached} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#68745f] disabled:cursor-not-allowed disabled:opacity-40" aria-label="افزایش تعداد" onClick={() => updateQuantity(item._id, item.quantity + 1)}>
              <Plus className="text-gray-300" aria-hidden="true" />
            </button>
          </div>
          <div className="text-end md:order-4 md:w-36">
            <p dir="ltr" className="text-base font-bold text-[#252722]">{formatPrice(item.price)}</p>
            {isStockTracked(item) && <p className="mt-1 text-xs text-[#55584f]">موجودی: {new Intl.NumberFormat("fa-IR").format(item.stock)}</p>}
          </div>
        </div>
        <div className="w-full min-w-0 flex-1 space-y-4 md:order-2 md:max-w-md">
          <p className="text-base font-semibold text-[#252722]">{item.name}</p>
          <p className="text-sm leading-6 text-[#55584f]">{item.description}</p>
          <div className="flex items-center gap-4">
            <button type="button" className="inline-flex items-center text-sm font-medium min-h-10 gap-2 rounded-full px-3 text-[#8b3d34] transition hover:bg-[#fff0ee] hover:text-[#7f332b] hover:underline" aria-label="حذف از سبد خرید" onClick={() => removeFromCart(item._id)}>
              <Trash aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CartItem;
