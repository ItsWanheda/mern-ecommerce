import { useEffect, useState } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";

const FeaturedProducts = ({ featuredProducts = [] }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [itemsPerPage, setItemsPerPage] = useState(4);
	const { addToCart } = useCartStore();

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 640) setItemsPerPage(1);
			else if (window.innerWidth < 1024) setItemsPerPage(2);
			else if (window.innerWidth < 1280) setItemsPerPage(3);
			else setItemsPerPage(4);
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		setCurrentIndex(0);
	}, [itemsPerPage, featuredProducts.length]);

	const nextSlide = () => {
		setCurrentIndex((prevIndex) => Math.min(prevIndex + itemsPerPage, Math.max(0, featuredProducts.length - itemsPerPage)));
	};

	const prevSlide = () => {
		setCurrentIndex((prevIndex) => Math.max(0, prevIndex - itemsPerPage));
	};

	const isStartDisabled = currentIndex === 0;
	const isEndDisabled = currentIndex >= featuredProducts.length - itemsPerPage;

	return (
		<section className="py-8 sm:py-10" aria-labelledby="featured-products-heading">
			<div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">Selected for you</p>
					<h2 id="featured-products-heading" className="font-serif text-3xl font-medium tracking-tight text-[#252722] sm:text-4xl">
						Featured pieces
					</h2>
				</div>
				<p className="max-w-sm text-sm leading-6 text-[#62645c] sm:text-right">
					A considered edit of pieces worth a closer look.
				</p>
			</div>

			<div className="relative">
				<div className="overflow-hidden">
					<div
						className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
						style={{ transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)` }}
					>
						{featuredProducts.map((product) => (
							<div
								key={product._id}
								className="shrink-0 px-2"
								style={{ flexBasis: `${100 / itemsPerPage}%` }}
							>
								<article className="h-full overflow-hidden rounded-xl border border-[#e4e0d8] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#252722]/5">
									<div className="aspect-[4/5] overflow-hidden bg-[#f0eee8]">
										<img
											src={product.image}
											alt={product.name}
											className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03] motion-reduce:transition-none"
											loading="lazy"
										/>
									</div>
									<div className="p-4 sm:p-5">
										<h3 className="line-clamp-2 min-h-12 text-sm font-medium leading-6 text-[#252722] sm:text-base">
											{product.name}
										</h3>
										<p className="mt-2 text-base font-semibold tabular-nums text-[#252722]">
											{Number(product.price).toLocaleString("en-US", { style: "currency", currency: "USD" })}
										</p>
										<button
											type="button"
											onClick={() => addToCart(product)}
											className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#252722] px-4 py-2 text-sm font-semibold text-[#252722] transition hover:bg-[#252722] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"
										>
											<ShoppingCart size={17} aria-hidden="true" />
											Add to cart
										</button>
									</div>
								</article>
							</div>
						))}
					</div>
				</div>

				{featuredProducts.length > itemsPerPage && (
					<div className="mt-5 flex justify-end gap-2">
						<button
							type="button"
							onClick={prevSlide}
							disabled={isStartDisabled}
							aria-label="Previous featured products"
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d0c5] text-[#252722] transition hover:border-[#252722] disabled:cursor-not-allowed disabled:opacity-35"
						>
							<ChevronLeft size={19} aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={nextSlide}
							disabled={isEndDisabled}
							aria-label="Next featured products"
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d5d0c5] text-[#252722] transition hover:border-[#252722] disabled:cursor-not-allowed disabled:opacity-35"
						>
							<ChevronRight size={19} aria-hidden="true" />
						</button>
					</div>
				)}
			</div>
		</section>
	);
};

export default FeaturedProducts;
