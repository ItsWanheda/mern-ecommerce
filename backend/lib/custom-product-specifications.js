export const normalizeCustomSpecifications = (input, fallback = []) => {
  const source = input === undefined ? fallback : input;
  if (!Array.isArray(source)) return { error: "مشخصات تکمیلی باید به‌صورت فهرست ارسال شوند." };
  if (source.length > 30) return { error: "حداکثر ۳۰ مشخصه تکمیلی برای هر محصول مجاز است." };

  const rows = [];
  const labels = new Set();
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: "یکی از ردیف‌های مشخصات محصول معتبر نیست." };
    }
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const value = typeof item.value === "string" ? item.value.trim() : "";
    if (!name && !value) continue;
    if (!name || !value) return { error: "برای هر مشخصه، هم عنوان و هم مقدار را وارد کنید." };
    if (name.length > 80 || value.length > 500) {
      return { error: "عنوان مشخصه حداکثر ۸۰ و مقدار آن حداکثر ۵۰۰ نویسه است." };
    }
    const normalizedLabel = name.toLocaleLowerCase("fa-IR");
    if (labels.has(normalizedLabel)) return { error: "عنوان مشخصه تکراری است: " + name };
    labels.add(normalizedLabel);
    rows.push({ name, value });
  }
  return { values: rows };
};
