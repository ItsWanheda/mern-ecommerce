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

const containsCommonPasswordPattern = (password) => {
  const normalized = password.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]/g, "");
  return ["password", "passw0rd", "pssw0rd", "qwerty", "letmein", "welcome", "changeme", "iloveyou", "123456", "654321", "abc123"]
    .some((pattern) => normalized.includes(pattern));
};

export const getPasswordPolicyError = (password) => {
  if (typeof password !== "string") return "رمز عبور را وارد کنید.";
  if (Array.from(password).length < MIN_PASSWORD_CHARACTERS) {
    return "رمز عبور باید حداقل ۱۲ نویسه داشته باشد.";
  }
  if (new TextEncoder().encode(password).length > MAX_BCRYPT_INPUT_BYTES) {
    return "رمز عبور بیش از حد طولانی است؛ حداکثر ۷۲ بایت UTF-8 مجاز است.";
  }
  if (containsCommonPasswordPattern(password)) return "از رمزهای عبور رایج یا الگوهای قابل حدس استفاده نکنید.";
  if (hasTraditionalComplexity(password) || hasLongPassphraseComplexity(password)) return "";
  return "از رمز عبور قوی استفاده کنید: حروف کوچک و بزرگ انگلیسی، عدد و نماد؛ یا یک عبارت حداقل ۱۶ نویسه‌ای شامل حرف، عدد و نماد.";
};
