import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import { useUserStore } from "./stores/useUserStore";
import LoadingSpinner from "./components/LoadingSpinner";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import StoreInfoPage from "./pages/StoreInfoPage";
import NewsletterUnsubscribePage from "./pages/NewsletterUnsubscribePage";
import StoreFooter from "./components/StoreFooter";
import { useCartStore } from "./stores/useCartStore";
import PurchaseSuccessPage from "./pages/PurchaseSuccessPage";
import PurchaseCancelPage from "./pages/PurchaseCancelPage";

function App() {
  const location = useLocation();
  const isAccountPage = location.pathname === "/login" || location.pathname === "/signup";
  const { user, checkAuth, checkingAuth } = useUserStore();
  const { setAuthenticated, initializeGuestCart, mergeGuestCart } = useCartStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    setAuthenticated(Boolean(user));
    if (!user) {
      initializeGuestCart();
      return;
    }
    mergeGuestCart();
  }, [user, setAuthenticated, initializeGuestCart, mergeGuestCart]);

  if (checkingAuth) return <LoadingSpinner />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f5f0] text-[#252722]">
      <div className={`relative z-50 ${isAccountPage ? "pt-0" : "pt-32 md:pt-44 min-[1680px]:pt-32"}`}>
        {!isAccountPage && <Navbar />}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to={location.state?.from?.pathname || "/"} />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={location.state?.from?.pathname || "/"} />} />
          <Route path="/secret-dashboard" element={user?.role === "admin" ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/product/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/shipping-policy" element={<StoreInfoPage />} />
          <Route path="/returns-policy" element={<StoreInfoPage />} />
          <Route path="/support" element={<StoreInfoPage />} />
          <Route path="/faq" element={<StoreInfoPage />} />
          <Route path="/privacy-policy" element={<StoreInfoPage />} />
          <Route path="/terms-of-use" element={<StoreInfoPage />} />
          <Route path="/newsletter-unsubscribe" element={<NewsletterUnsubscribePage />} />
          <Route path="/purchase-success" element={user ? <PurchaseSuccessPage /> : <Navigate to="/login" />} />
          <Route path="/purchase-cancel" element={user ? <PurchaseCancelPage /> : <Navigate to="/login" />} />
        </Routes>
      </div>
      {!isAccountPage && <StoreFooter />}
      <Toaster />
    </div>
  );
}
export default App;
