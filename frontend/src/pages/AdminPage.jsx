import { BarChart, PlusCircle, ShoppingBasket, Megaphone, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import AnalyticsTab from "../components/AnalyticsTab";
import CreateProductForm from "../components/CreateProductForm";
import ProductsList from "../components/ProductsList";
import CampaignManager from "../components/CampaignManager";
import ShippingSettings from "../components/ShippingSettings";
import { useProductStore } from "../stores/useProductStore";

const tabs = [
  { id: "create", label: "ایجاد محصول", icon: PlusCircle },
  { id: "products", label: "محصولات و موجودی", icon: ShoppingBasket },
  { id: "campaigns", label: "کمپین‌ها", icon: Megaphone },
  { id: "shipping", label: "ارسال", icon: Truck },
  { id: "analytics", label: "آمار و تحلیل", icon: BarChart },
];

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("create");
  const { fetchAllProducts } = useProductStore();

  useEffect(() => { fetchAllProducts(); }, [fetchAllProducts]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-16">
        <motion.h1 className="mb-8 text-center text-4xl font-bold text-emerald-400" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>داشبورد مدیریت</motion.h1>
        <div dir="rtl" className="mb-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              <tab.icon className="h-5 w-5" aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>
        {activeTab === "create" && <CreateProductForm />}
        {activeTab === "products" && <ProductsList />}
        {activeTab === "campaigns" && <CampaignManager />}
        {activeTab === "shipping" && <ShippingSettings />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
};
export default AdminPage;
