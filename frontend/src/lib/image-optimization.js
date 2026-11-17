const CLOUDINARY_UPLOAD_PATH = "/image/upload/";
const TRANSFORMATION_PREFIX = /^(?:a_|ar_|b_|bo_|c_|dpr_|e_|f_|fl_|g_|h_|l_|o_|q_|r_|t_|u_|w_|x_|y_|z_)/;

export const optimizeCloudinaryImageUrl = (value) => {
  if (typeof value !== "string" || !value) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return value;

    const markerIndex = url.pathname.indexOf(CLOUDINARY_UPLOAD_PATH);
    if (markerIndex < 0) return value;

    const prefix = url.pathname.slice(0, markerIndex + CLOUDINARY_UPLOAD_PATH.length);
    const assetPath = url.pathname.slice(markerIndex + CLOUDINARY_UPLOAD_PATH.length);
    if (!assetPath || /(^|\/)s--[^/]+--(\/|$)/.test(assetPath)) return value;

    const segments = assetPath.split("/");
    if (TRANSFORMATION_PREFIX.test(segments[0])) {
      const transformations = segments[0].split(",");
      if (!transformations.some((item) => item.startsWith("f_"))) transformations.push("f_auto");
      if (!transformations.some((item) => item.startsWith("q_"))) transformations.push("q_auto");
      segments[0] = transformations.join(",");
      url.pathname = prefix + segments.join("/");
    } else {
      url.pathname = prefix + "f_auto,q_auto/" + assetPath;
    }

    return url.toString();
  } catch {
    return value;
  }
};
