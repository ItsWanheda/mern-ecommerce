import { Plus, Trash2 } from "lucide-react";

export default function CustomProductSpecifications({ value = [], onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const updateRow = (index, field, nextValue) => {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: nextValue } : row));
  };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--ui-text)]">مشخصات تکمیلی محصول (اختیاری)</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">هر اطلاعاتی که در فیلدهای دسته‌بندی وجود ندارد، اینجا اضافه کنید؛ مثل گارانتی، اقلام همراه یا توضیح کوتاه. این موارد در صفحه محصول نمایش داده می‌شوند.</p>
        </div>
        <button
          type="button"
          disabled={rows.length >= 30}
          onClick={() => onChange([...rows, { name: "", value: "" }])}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-3 py-2 text-xs font-semibold text-[var(--ui-text)] transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} aria-hidden="true" /> افزودن مشخصه
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-4 text-center text-xs text-[var(--ui-muted)]">هنوز مشخصه‌ای اضافه نشده است. برای افزودن، روی «افزودن مشخصه» بزنید.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid min-w-0 gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-start">
              <label className="block min-w-0 text-xs font-medium text-[var(--ui-muted)]">
                عنوان مشخصه
                <input
                  value={row.name || ""}
                  onChange={event => updateRow(index, "name", event.target.value)}
                  maxLength={80}
                  placeholder="مثلاً گارانتی"
                  className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-focus)]"
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-[var(--ui-muted)]">
                مقدار / توضیح
                <input
                  value={row.value || ""}
                  onChange={event => updateRow(index, "value", event.target.value)}
                  maxLength={500}
                  placeholder="مثلاً ۱۸ ماه گارانتی شرکتی"
                  className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-input-bg)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-focus)]"
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                aria-label={"حذف مشخصه " + (index + 1)}
                title="حذف مشخصه"
                className="inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-lg border border-[var(--ui-danger)]/40 px-3 text-xs font-medium text-[var(--ui-danger)] transition hover:bg-[var(--ui-danger-bg)] sm:mt-5 sm:min-w-10 sm:px-2"
              >
                <Trash2 size={15} aria-hidden="true" /><span className="sm:hidden">حذف ردیف</span>
              </button>
            </div>
          ))}
          <p className="text-[11px] text-[var(--ui-muted)]">ردیف‌های خالی ذخیره نمی‌شوند. حداکثر ۳۰ مشخصه قابل ثبت است.</p>
        </div>
      )}
    </section>
  );
}
