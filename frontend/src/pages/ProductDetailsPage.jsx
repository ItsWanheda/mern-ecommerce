import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const formatPrice = (price) => Number(price).toLocaleString("en-US", { style: "currency", currency: "USD" });

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useUserStore();
  const { addToCart } = useCartStore();

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      setLoading(true); setError(""); setProduct(null);
      try {
        const response = await axios.get(`/products/${productId}`);
        if (active) setProduct(response.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "We couldn't load this product. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [productId]);

  const handleAddToCart = () => {
    if (!user) return toast.error("Please sign in to add items to your cart.", { id: "login" });
    addToCart(product);
  };

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center bg-[#f7f5f0] px-4 text-[#252722]"><div className="flex items-center gap-3 text-sm text-[#62645c]" role="status"><LoaderCircle className="animate-spin" size={20} aria-hidden="true" />Loading product details…</div></main>;
  if (error || !product) return <main className="min-h-[60vh] bg-[#f7f5f0] px-4 py-16 text-[#252722] sm:px-6"><div className="mx-auto max-w-3xl rounded-2xl border border-[#e4e0d8] bg-[#fffefa] px-6 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">Product unavailable</p><h1 className="mt-3 font-serif text-3xl">We couldn't find that piece.</h1><p className="mt-3 text-sm leading-6 text-[#77786f]">{error || "This product may have been removed."}</p><Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b]"><ArrowLeft size={16} aria-hidden="true" />Back to the collection</Link></div></main>;

  return <main className="min-h-screen bg-[#f7f5f0] px-4 py-8 text-[#252722] sm:px-6 sm:py-12 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <Link to={product.category ? `/category/${encodeURIComponent(product.category)}` : "/"} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><ArrowLeft size={16} aria-hidden="true" />Back to {product.category || "the collection"}</Link>
      <div className="mt-5 grid overflow-hidden rounded-[2rem] border border-[#e4e0d8] bg-[#fffefa] lg:grid-cols-2">
        <div className="relative min-h-[360px] bg-[#f0eee8] sm:min-h-[520px]">{product.image ? <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex min-h-[360px] h-full items-center justify-center text-sm text-[#77786f]">Image coming soon</div>}</div>
        <div className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16"><div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">{product.category || "The collection"}</p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-5 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
          <div className="my-7 h-px bg-[#e4e0d8]" />
          <h2 className="text-sm font-semibold">About this piece</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#62645c]">{product.description || "A considered addition to your everyday collection."}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleAddToCart} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#252722] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><ShoppingCart size={17} aria-hidden="true" />Add to cart</button>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d5d0c5] px-6 py-3 text-sm font-semibold text-[#252722] transition hover:border-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">Continue browsing <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-[#77786f]"><Check size={15} className="shrink-0 text-[#68745f]" aria-hidden="true" />Clear pricing. No unverified sale or stock claims.</p>
        </div></div>
      </div>
    </div>
  </main>;
};
export default ProductDetailsPage;
