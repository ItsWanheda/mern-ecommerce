import { useState } from "react";
import { motion } from "framer-motion";
import { Trash, Star, Save } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";
import { formatPrice, isStockTracked } from "../lib/commerce";

const labels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };

const ProductsList = () => {
  const { deleteProduct, toggleFeaturedProduct, updateProductStock, products } = useProductStore();
  const [drafts, setDrafts] = useState({});

  const saveStock = async (product) => {
    const raw = drafts[product._id] ?? (isStockTracked(product) ? String(product.stock) : "");
    if (raw === "" || !Number.isInteger(Number(raw)) || Number(raw) < 0) return;
    const saved = await updateProductStock(product._id, Number(raw));
    if (saved) setDrafts((previous) => ({ ...previous, [product._id]: String(raw) }));
  };

  return (
    <motion.div dir="rtl" className="mx-auto max-w-6xl overflow-x-auto rounded-lg bg-gray-800 shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <table className="min-w-[760px] w-full divide-y divide-gray-700">
        <thead className="bg-gray-700"><tr>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">محصول</th>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">قیمت</th>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">دسته‌بندی</th>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">موجودی</th>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">ویژه</th>
          <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-300">عملیات</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {products?.map((product) => (
            <tr key={product._id} className="hover:bg-gray-700">
              <td className="whitespace-nowrap px-4 py-4">
                <div className="flex items-center gap-3">
                  {product.image ? <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt="" /> : <div className="h-10 w-10 rounded-full bg-gray-700" />}
                  <span className="max-w-48 truncate text-sm font-medium text-white">{product.name}</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-300"><span dir="ltr">{formatPrice(product.price)}</span></td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-300">{labels[product.category] || product.category}</td>
              <td className="px-4 py-4">
                <p className="mb-2 text-xs text-gray-400">{isStockTracked(product) ? `ثبت‌شده: ${new Intl.NumberFormat("fa-IR").format(product.stock)}` : "موجودی ثبت نشده"}</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="1" aria-label={`موجودی ${product.name}`} value={drafts[product._id] ?? (isStockTracked(product) ? String(product.stock) : "")} onChange={(event) => setDrafts((previous) => ({ ...previous, [product._id]: event.target.value }))} className="w-20 rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white" />
                  <button type="button" onClick={() => saveStock(product)} aria-label={`ذخیره موجودی ${product.name}`} className="rounded-md p-2 text-[#68745f] hover:bg-gray-600"><Save size={16} aria-hidden="true" /></button>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <button type="button" onClick={() => toggleFeaturedProduct(product._id)} aria-label={product.isFeatured ? "حذف از محصولات منتخب" : "افزودن به محصولات منتخب"} className={`rounded-full p-2 transition-colors ${product.isFeatured ? "bg-yellow-400 text-gray-900" : "bg-gray-600 text-gray-300 hover:bg-yellow-500"}`}><Star className="h-5 w-5" aria-hidden="true" /></button>
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <button type="button" onClick={() => deleteProduct(product._id)} aria-label={`حذف ${product.name}`} className="rounded-full p-2 text-red-400 hover:bg-gray-600 hover:text-red-300"><Trash className="h-5 w-5" aria-hidden="true" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && <p className="p-6 text-center text-sm text-gray-400">هنوز محصولی ثبت نشده است.</p>}
    </motion.div>
  );
};
export default ProductsList;
