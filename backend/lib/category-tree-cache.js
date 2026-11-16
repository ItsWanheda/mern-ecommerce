import Category from "../models/category.model.js";
import { redis } from "./redis.js";

const CATEGORY_TREE_CACHE_KEY = "category_tree_v1";
const CATEGORY_TREE_CACHE_TTL_SECONDS = 180;
let cacheWarningLogged = false;

const idOf = (value) => value == null ? "" : String(value);

export const filterVisibleCategoryTree = (categories = []) => {
  const activeIds = new Set(categories
    .filter((category) => category.isActive !== false)
    .map((category) => idOf(category._id)));
  return categories
    .filter((category) =>
      category.isActive !== false &&
      (category.ancestors || []).every((ancestor) => activeIds.has(idOf(ancestor)))
    )
    .sort((a, b) =>
      Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
      String(a.name?.fa || "").localeCompare(String(b.name?.fa || ""), "fa")
    );
};

export const getVisibleCategoryTree = async () => {
  try {
    const cached = await redis.get(CATEGORY_TREE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Category tree cache unavailable; reading categories from MongoDB:", error.message);
      cacheWarningLogged = true;
    }
  }

  const categories = await Category.find({})
    .select("_id slug parentId ancestors isActive showInNavigation sortOrder name description image attributes createdAt updatedAt")
    .sort({ sortOrder: 1, "name.fa": 1 })
    .lean();
  const visible = filterVisibleCategoryTree(categories);
  try {
    await redis.set(CATEGORY_TREE_CACHE_KEY, JSON.stringify(visible), "EX", CATEGORY_TREE_CACHE_TTL_SECONDS);
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Unable to write category tree cache:", error.message);
      cacheWarningLogged = true;
    }
  }
  return visible;
};

export const invalidateCategoryTreeCache = async () => {
  try {
    await redis.del(CATEGORY_TREE_CACHE_KEY);
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Unable to invalidate category tree cache; short TTL will recover it:", error.message);
      cacheWarningLogged = true;
    }
  }
};
