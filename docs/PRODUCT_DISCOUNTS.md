# Direct product discounts

Direct discounts are stored on the product itself and are independent of the campaign/banner system.

## Admin workflow

Open **Admin → Products & Inventory**. Select one product with its row checkbox, or select multiple products (including across pages). The selection panel accepts one shared whole-number percentage from **1 to 99**. Choose **Remove discount** to reset the selected products to zero. Up to 100 products can be updated per request.

Archived products and products that still require the legacy catalogue migration are not selectable in the Admin UI. The backend validates all product IDs, requires active products, and records an audit event per product.

## Price calculation

- `price` remains the original catalogue price in whole Toman.
- `discountPercent` stores the direct percentage, defaulting to zero for existing products.
- Discount amount is rounded to the nearest whole Toman using `Math.round(price * percent / 100)`.
- Sale price is `price - discountAmount`.

The same calculation is shared by the backend and storefront. Product cards, product details, quick search, cart lines, checkout summaries, category/search price filters, price ranges, and order history display or use the sale price.

## Checkout and coupons

The server reloads products from PostgreSQL through Prisma during checkout; it never trusts a price or percentage supplied by the browser. If a product's original price or discount changes during checkout, the transaction is rejected and the cart must be refreshed.

The order snapshots each line's payable `price`, `originalPrice`, and `discountPercent`, plus the total `productDiscountAmount`. Product discounts are applied first. An eligible coupon is then calculated against the already-discounted subtotal, and shipping is calculated from the post-coupon subtotal. Existing coupon reservations and Zarinpal payment reconciliation remain in use.

## Operational notes

- This is a persistent direct product discount; it has no schedule or campaign dependency. Remove it manually when the offer ends.
- Changing a product's base price keeps its percentage, so the sale price recalculates automatically.
- Featured, recommended, bestseller, and price-bound caches are refreshed or invalidated after a bulk discount update.
- New discounts are audited with the before/after percentage and sale price.
