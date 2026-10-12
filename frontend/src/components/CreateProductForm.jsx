import { useState } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader } from "lucide-react";
import { useProductStore } from "../stores/useProductStore";

const categories = ["jeans", "t-shirts", "shoes", "glasses", "jackets", "suits", "bags"];
const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };

const CreateProductForm = () => {
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "", stock: "0", category: "", image: "" });
  const { createProduct, loading } = useProductStore();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await createProduct(newProduct);
      setNewProduct({ name: "", description: "", price: "", stock: "0", category: "", image: "" });
    } catch {
      // The store displays the API error to the administrator.
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewProduct((previous) => ({ ...previous, image: reader.result }));
    reader.readAsDataURL(file);
  };
  const fieldClass = "mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <motion.div dir="rtl" className="mx-auto mb-8 max-w-xl rounded-lg bg-gray-800 p-8 shadow-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="mb-6 text-2xl font-semibold text-emerald-300">ایجاد محصول جدید</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-300">نام محصول
          <input type="text" value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} className={fieldClass} maxLength={160} required />
        </label>
        <label className="block text-sm font-medium text-gray-300">توضیحات
          <textarea value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} rows={3} className={fieldClass} maxLength={5000} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-300">قیمت ({import.meta.env.VITE_STORE_CURRENCY || "USD"})
            <input type="number" min="0" step={(import.meta.env.VITE_STORE_CURRENCY || "USD") === "IRT" ? "1" : "0.01"} value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })} className={fieldClass} required />
          </label>
          <label className="block text-sm font-medium text-gray-300">موجودی انبار (عدد صحیح)
            <input type="number" min="0" step="1" value={newProduct.stock} onChange={(event) => setNewProduct({ ...newProduct, stock: event.target.value })} className={fieldClass} required />
          </label>
        </div>
        <label className="block text-sm font-medium text-gray-300">دسته‌بندی
          <select value={newProduct.category} onChange={(event) => setNewProduct({ ...newProduct, category: event.target.value })} className={fieldClass} required>
            <option value="">یک دسته‌بندی انتخاب کنید</option>
            {categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" id="product-image" className="sr-only" accept="image/*" onChange={handleImageChange} />
          <label htmlFor="product-image" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600"><Upload className="h-5 w-5" aria-hidden="true" />بارگذاری تصویر</label>
          {newProduct.image && <span className="text-sm text-gray-400">تصویر انتخاب شد</span>}
        </div>
        <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">
          {loading ? <><Loader className="h-5 w-5 animate-spin" aria-hidden="true" />در حال ذخیره…</> : <><PlusCircle className="h-5 w-5" aria-hidden="true" />ایجاد محصول</>}
        </button>
      </form>
    </motion.div>
  );
};
export default CreateProductForm;
