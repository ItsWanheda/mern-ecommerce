import { Activity, BarChart, PlusCircle, ShoppingBasket, Megaphone, Truck, Mail, ScrollText, FolderTree, TicketPercent } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const AnalyticsTab = lazy(() => import("../components/AnalyticsTab"));
const DashboardOverview = lazy(() => import("../components/DashboardOverview"));
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
  { id: "dashboard", label: "نمای کلی", icon: Activity },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "dashboard");
  }, [requestedTab]);
  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams((current) => { const next = new URLSearchParams(current); next.set("tab", tabId); return next; });
  };
  const handleTabKeyDown = (event, currentId) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === currentId);
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowLeft" ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[nextIndex].id);
    document.getElementById("admin-tab-" + tabs[nextIndex].id)?.focus();
  };


  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-16">
        <motion.h1 className="mb-8 text-center text-4xl font-bold text-[var(--brand-primary)]" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>داشبورد مدیریت</motion.h1>
        <div dir="rtl" role="tablist" aria-label="بخش‌های مدیریت" className="mb-8 flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button id={"admin-tab-" + tab.id} key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls="admin-tab-panel" onKeyDown={(event) => handleTabKeyDown(event, tab.id)} onClick={() => selectTab(tab.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? "bg-[var(--brand-primary)] text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              <tab.icon className="h-5 w-5" aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>
        <div id="admin-tab-panel" role="tabpanel" aria-labelledby={"admin-tab-" + activeTab}>
        <Suspense fallback={<div role="status" className="rounded-xl border border-gray-700 bg-gray-800 p-8 text-center text-sm text-gray-400">در حال بارگذاری بخش مدیریت…</div>}>
          {activeTab === "dashboard" && <DashboardOverview />}
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
    </div>
  );
};
export default AdminPage;
