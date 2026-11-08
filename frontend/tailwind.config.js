/** @type {import('tailwindcss').Config} */
const semanticColor = (token) => `rgb(var(--color-${token}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./frontend/index.html", "./frontend/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: semanticColor("canvas"),
        surface: semanticColor("surface"),
        "surface-raised": semanticColor("surface-raised"),
        "surface-muted": semanticColor("surface-muted"),
        strong: semanticColor("strong"),
        "strong-hover": semanticColor("strong-hover"),
        ink: semanticColor("ink"),
        "ink-strong": semanticColor("ink-strong"),
        muted: semanticColor("muted"),
        "muted-soft": semanticColor("muted-soft"),
        border: semanticColor("border"),
        "border-strong": semanticColor("border-strong"),
        hover: semanticColor("hover"),
        brand: semanticColor("brand"),
        "brand-hover": semanticColor("brand-hover"),
        "brand-soft": semanticColor("brand-soft"),
        "brand-deep": semanticColor("brand-deep"),
        "brand-muted": semanticColor("brand-muted"),
        disabled: semanticColor("disabled"),
        success: semanticColor("success"),
        danger: semanticColor("danger"),
        warning: semanticColor("warning"),
        "on-brand": semanticColor("on-brand"),
      },
    },
  },
  plugins: [],
};
