export const MAX_PRODUCT_IMAGE_COUNT = 8;
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_TOTAL_BYTES = 12 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const getImageDataUrlByteLength = (value) => {
  if (typeof value !== "string") return 0;
  const match = /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match) return 0;
  const encoded = match[1];
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
};

export const validateProductImageSelection = ({ currentImages = [], files = [] } = {}) => {
  if (!Array.isArray(currentImages) || !Array.isArray(files)) return "invalid_selection";
  if (currentImages.length + files.length > MAX_PRODUCT_IMAGE_COUNT) return "too_many_images";

  if (files.some((file) => {
    const type = typeof file?.type === "string" ? file.type.toLowerCase() : "";
    return !allowedImageTypes.has(type) ||
      !Number.isFinite(file?.size) ||
      file.size <= 0 ||
      file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES;
  })) {
    return "invalid_file";
  }

  const existingBytes = currentImages.reduce((total, image) => total + getImageDataUrlByteLength(image), 0);
  const newBytes = files.reduce((total, file) => total + file.size, 0);
  if (existingBytes + newBytes > MAX_PRODUCT_IMAGE_TOTAL_BYTES) return "total_too_large";
  return "";
};

export const getProductImageSelectionMessage = (issue) => {
  switch (issue) {
    case "too_many_images":
      return "حداکثر ۸ تصویر برای هر محصول مجاز است.";
    case "invalid_file":
      return "فقط تصاویر JPG، PNG، WebP یا GIF با حجم حداکثر ۲ مگابایت برای هر تصویر مجاز هستند.";
    case "total_too_large":
      return "مجموع حجم تصاویر محصول نباید از ۱۲ مگابایت بیشتر شود.";
    case "invalid_selection":
      return "فهرست تصاویر انتخاب‌شده معتبر نیست.";
    default:
      return "";
  }
};
