const MIN_PASSWORD_CHARACTERS = 12;
const MAX_BCRYPT_INPUT_BYTES = 72;

const hasTraditionalComplexity = (password) =>
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\p{N}/u.test(password) &&
  /[^A-Za-z0-9\s]/u.test(password);

const hasLongPassphraseComplexity = (password) =>
  Array.from(password).length >= 16 &&
  /\p{L}/u.test(password) &&
  /\p{N}/u.test(password) &&
  /[\p{P}\p{S}]/u.test(password);

export const getPasswordPolicyError = (password) => {
  if (typeof password !== "string") return "رمز عبور را وارد کنید.";
  if (Array.from(password).length < MIN_PASSWORD_CHARACTERS) {
    return "رمز عبور باید حداقل ۱۲ نویسه داشته باشد.";
  }
  if (new TextEncoder().encode(password).length > MAX_BCRYPT_INPUT_BYTES) {
    return "رمز عبور بیش از حد طولانی است؛ حداکثر ۷۲ بایت UTF-8 مجاز است.";
  }
  if (hasTraditionalComplexity(password) || hasLongPassphraseComplexity(password)) return "";
  return "از رمز عبور قوی استفاده کنید: حروف کوچک و بزرگ انگلیسی، عدد و نماد؛ یا یک عبارت حداقل ۱۶ نویسه‌ای شامل حرف، عدد و نماد.";
};
