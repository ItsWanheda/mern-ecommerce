import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("storefront palette is fixed to the white C-option light scheme", async () => {
  const css = await readSource("../src/index.css");
  const layout = await readSource("../app/layout.jsx");

  assert.match(css, /--color-canvas:\s*255 255 255;/);
  assert.match(css, /--color-surface:\s*255 255 255;/);
  assert.match(css, /color-scheme:\s*light;/);
  assert.doesNotMatch(css, /data-theme=["']dark|color-scheme:\s*dark|prefers-color-scheme:\s*dark/);
  assert.doesNotMatch(layout, /computer-hardware-theme|themeInitialization|data-theme/);
  assert.match(layout, /name="theme-color" content="#ffffff"/);
});

test("navbar no longer exposes or persists a dark-mode option", async () => {
  const navbar = await readSource("../src/components/Navbar.jsx");
  assert.doesNotMatch(navbar, /renderThemeToggle|computer-hardware-theme|Moon|Sun|data-theme/);
  assert.match(navbar, /storefront-search-form/);
  assert.match(navbar, /نام قطعه، برند یا مدل/);
  assert.match(navbar, /lg:hidden/);
  assert.match(navbar, /md:hidden/);
  assert.ok(!navbar.includes('<span className="text-xs font-bold">جست‌وجو</span>'));
});

test("popular products use the admin-curated collection instead of purchase ranking", async () => {
  const home = await readSource("../src/store-pages/HomePage.jsx");
  const collection = await readSource("../src/store-pages/CollectionPage.jsx");

  assert.match(home, /محبوب‌ترین‌ها/);
  assert.match(home, /featuredProducts\.slice/);
  assert.doesNotMatch(home, /\/products\/bestsellers/);
  assert.match(collection, /title: "محبوب‌ترین‌ها"/);
  assert.match(collection, /axios\.get\("\/products\/featured"\)/);
});

 
test("storefront hero and campaign cards use wide responsive layouts", async () => {
  const home = await readSource("../src/store-pages/HomePage.jsx");

  assert.match(home, /storefront-hero/);
  assert.match(home, /storefront-campaign-strip/);
  assert.match(home, /snap-x snap-mandatory/);
  assert.doesNotMatch(home, /سیستم دلخواهت را با/);
  assert.doesNotMatch(home, /قطعات را بر اساس بودجه/);
});

test("compact footer retains core navigation, trust seal and newsletter functionality", async () => {
  const footer = await readSource("../src/components/StoreFooter.jsx");

  assert.match(footer, /پیوندهای اصلی فروشگاه/);
  assert.match(footer, /نماد اعتماد الکترونیکی/);
  assert.ok(footer.includes('axios.post("/newsletter/subscribe"'));
  assert.match(footer, /newsletter-unsubscribe/);
  assert.doesNotMatch(footer, /فضای نشانی فروشگاه آماده است/);
  assert.doesNotMatch(footer, /ShieldCheck|Truck/);
});
