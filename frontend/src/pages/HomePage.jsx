import { useEffect } from "react";
import { ArrowRight, Leaf, PackageCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import CategoryItem from "../components/CategoryItem";
import { useProductStore } from "../stores/useProductStore";
import FeaturedProducts from "../components/FeaturedProducts";

const categories = [
	{ href: "/jeans", name: "شلوار جین", imageUrl: "/jeans.jpg" },
	{ href: "/t-shirts", name: "تی‌شرت", imageUrl: "/tshirts.jpg" },
	{ href: "/shoes", name: "کفش", imageUrl: "/shoes.jpg" },
	{ href: "/glasses", name: "عینک", imageUrl: "/glasses.png" },
	{ href: "/jackets", name: "کاپشن و کت", imageUrl: "/jackets.jpg" },
	{ href: "/suits", name: "کت‌وشلوار", imageUrl: "/suits.jpg" },
	{ href: "/bags", name: "کیف", imageUrl: "/bags.jpg" },
];

const HomePage = () => {
	const { fetchFeaturedProducts, products, loading } = useProductStore();

	useEffect(() => {
		fetchFeaturedProducts();
	}, [fetchFeaturedProducts]);

	return (
		<main
			dir="rtl"
			className="min-h-screen overflow-hidden bg-[#f7f5f0] text-[#252722]"
		>
			<div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
				<section className="relative isolate overflow-hidden rounded-2xl bg-[#e9e5dc]">
					<div className="grid grid-cols-1 items-stretch lg:min-h-[540px] lg:grid-cols-2">
						{/* Hero image */}
						<div className="relative order-1 min-h-[280px] overflow-hidden lg:order-2 lg:min-h-[540px]">
							<img
								src="/jackets.jpg"
								alt="مدل‌های ماندگار کت و کاپشن را ببینید"
								className="absolute inset-0 h-full w-full object-cover object-center"
								fetchPriority="high"
							/>
							<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#e9e5dc]/30 lg:bg-gradient-to-l lg:from-transparent lg:via-[#e9e5dc]/10 lg:to-[#e9e5dc]/30" />
							
							<div className="absolute bottom-5 right-5 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-xs font-medium tracking-wide text-[#252722] backdrop-blur-sm">
								سادگی با جلوه‌ای خاص
							</div>
						</div>

						{/* Hero content */}
						<div className="relative z-10 order-2 min-w-0 px-6 py-12 sm:px-10 lg:order-1 lg:px-12 lg:py-16 xl:px-14 xl:py-20">
							<p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">
								<Sparkles size={15} aria-hidden="true" />
								سبکی سنجیده، راحتی هر روز
							</p>

							<h1 className="max-w-xl font-serif text-4xl font-medium leading-[1.08] tracking-tight text-[#252722] sm:text-5xl xl:text-6xl">
								سبک خودت را پیدا کن.
								<br />
								همیشه <span className="italic text-[#68745f]">ماندگار.</span>
							</h1>

							<p className="mt-6 max-w-md text-base leading-7 text-[#62645c] sm:text-lg">
								پوشاک و اکسسوری‌های کاربردی را ببینید؛ انتخاب‌هایی هماهنگ برای تمام فصل‌ها.
							</p>

							<div className="mt-8 flex flex-wrap items-center gap-3">
								<Link
									to="/category/jeans"
									className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#252722] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								>
									مشاهده مجموعه
									<ArrowRight size={17} aria-hidden="true" />
								</Link>

								<a
									href="#shop-by-category"
									className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#c7c3b9] px-6 py-3 text-sm font-semibold text-[#252722] transition hover:border-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
								>
									مشاهده دسته‌بندی‌ها
								</a>
							</div>

							<div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#d5d0c5] pt-5 text-xs text-[#62645c] sm:text-sm">
								<span className="inline-flex items-center gap-2">
									<Leaf size={16} aria-hidden="true" />
									انتخاب‌های روزمره
								</span>
								<span className="inline-flex items-center gap-2">
									<PackageCheck size={16} aria-hidden="true" />
									خرید آسان، انتخاب روشن
								</span>
							</div>
						</div>
					</div>
				</section>

				<section
					id="shop-by-category"
					className="scroll-mt-28 pt-16 sm:pt-20"
				>
					<div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">
								انتخاب مناسب شما
							</p>
							<h2 className="font-serif text-3xl font-medium tracking-tight text-[#252722] sm:text-4xl">
								خرید بر اساس دسته‌بندی
							</h2>
						</div>

						<p className="max-w-md text-sm leading-6 text-[#62645c] sm:text-right">
							از آیتم‌های موردنیازتان شروع کنید و استایلی متناسب با خودتان بسازید.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{categories.map((category) => (
							<CategoryItem category={category} key={category.name} />
						))}
					</div>
				</section>

				{!loading && products.length > 0 && (
					<section className="mt-8 border-t border-[#e4e0d8] pt-8 sm:mt-12 sm:pt-12">
						<FeaturedProducts featuredProducts={products} />
					</section>
				)}
			</div>
		</main>
	);
};

export default HomePage;
