import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { parseIranianDateTime } from "../lib/iranian-date";

const IranianDateTimeInput = ({ id, label, value, onChange, required = false }) => {
  const [touched, setTouched] = useState(false);
  const isValid = Boolean(parseIranianDateTime(value));
  const showError = touched && Boolean(value) && !isValid;

  return (
    <label htmlFor={id} className="block text-sm text-gray-300">
      <span className="flex items-center gap-2">
        <CalendarClock size={15} className="text-[#68745f]" aria-hidden="true" />
        {label}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        required={required}
        maxLength={20}
        placeholder="۱۴۰۵/۰۷/۲۳ ۱۴:۳۰"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={showError}
        aria-describedby={showError ? id + "-error" : id + "-hint"}
        className={"mt-1 w-full rounded-lg border bg-gray-700 px-3 py-2 text-center text-sm tabular-nums text-white outline-none transition focus:ring-2 " +
          (showError
            ? "border-red-500 focus:border-red-400 focus:ring-red-500/20"
            : "border-gray-600 focus:border-[#68745f] focus:ring-[#68745f]/30")}
      />
      {showError ? (
        <span id={id + "-error"} role="alert" className="mt-1 block text-xs leading-5 text-red-300">
          تاریخ و ساعت را به‌شکل شمسی «سال/ماه/روز ساعت:دقیقه» وارد کنید.
        </span>
      ) : (
        <span id={id + "-hint"} className="mt-1 block text-[11px] leading-5 text-gray-400">
          تقویم شمسی · ساعت ایران (تهران) · نمونه: ۱۴۰۵/۰۷/۲۳ ۱۴:۳۰
        </span>
      )}
    </label>
  );
};

export default IranianDateTimeInput;
