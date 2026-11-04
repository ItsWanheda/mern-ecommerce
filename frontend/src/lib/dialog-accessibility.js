export const DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const trapDialogTabKey = (event, dialog, activeElement) => {
  if (event.key !== "Tab") return false;

  const focusable = Array.from(dialog.querySelectorAll(DIALOG_FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.disabled &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getAttribute("tabindex") !== "-1",
  );

  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
};
