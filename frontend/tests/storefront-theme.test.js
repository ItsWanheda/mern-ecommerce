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
