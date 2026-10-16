import { Activity, BarChart, PlusCircle, ShoppingBasket, Megaphone, Truck, Mail, ScrollText, FolderTree, TicketPercent } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const AnalyticsTab = lazy(() => import("../components/AnalyticsTab"));
const CreateProductForm = lazy(() => import("../components/CreateProductForm"));
const ProductsList = lazy(() => import("../components/ProductsList"));
const CampaignManager = lazy(() => import("../components/CampaignManager"));
const ShippingSettings = lazy(() => import("../components/ShippingSettings"));
const NewsletterManager = lazy(() => import("../components/NewsletterManager"));
const OrderManagement = lazy(() => import("../components/OrderManagement"));
const AuditLogTab = lazy(() => import("../components/AuditLogTab"));
const CategoryManager = lazy(() => import("../components/CategoryManager"));
const CouponManager = lazy(() => import("../components/CouponManager"));
const OperationsDashboard = lazy(() => import("../components/OperationsDashboard"));

const tabs = [
  { id: "create", label: "ایجاد محصول", icon: PlusCircle },
  { id: "products", label: "محصولات و موجودی", icon: ShoppingBasket },
  { id: "categories", label: "مدیریت دسته‌بندی‌ها", icon: FolderTree },
  { id: "coupons", label: "کدهای تخفیف", icon: TicketPercent },
  { id: "campaigns", label: "کمپین‌ها", icon: Megaphone },
  { id: "shipping", label: "ارسال", icon: Truck },
  { id: "newsletter", label: "خبرنامه", icon: Mail },
  { id: "analytics", label: "آمار و تحلیل", icon: BarChart },
  { id: "orders", label: "سفارش‌ها و رهگیری", icon: Truck },
  { id: "audit", label: "تاریخچه اقدامات", icon: ScrollText },
  { id: "operations", label: "وضعیت سامانه", icon: Activity },
];

const AdminPage = () => {
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "create";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabs.some((tab) => tab.id === requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);


  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-16">
        <motion.h1 className="mb-8 text-center text-4xl font-bold text-[#68745f]" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>داشبورد مدیریت</motion.h1>
        <div dir="rtl" className="mb-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? "bg-[#68745f] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              <tab.icon className="h-5 w-5" aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>
        <Suspense fallback={<div role="status" className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">در حال بارگذاری بخش مدیریت…</div>}>
          {activeTab === "create" && <CreateProductForm />}
          {activeTab === "products" && <ProductsList />}
          {activeTab === "categories" && <CategoryManager />}
          {activeTab === "coupons" && <CouponManager />}
          {activeTab === "campaigns" && <CampaignManager />}
          {activeTab === "shipping" && <ShippingSettings />}
          {activeTab === "newsletter" && <NewsletterManager />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "orders" && <OrderManagement />}
          {activeTab === "audit" && <AuditLogTab />}
          {activeTab === "operations" && <OperationsDashboard />}
        </Suspense>
      </div>
    </div>
  );
};
export default AdminPage;
