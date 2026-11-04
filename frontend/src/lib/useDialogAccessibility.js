import { useEffect, useRef } from "react";
import { DIALOG_FOCUSABLE_SELECTOR, trapDialogTabKey } from "./dialog-accessibility.js";

const INITIAL_FOCUS_SELECTOR = "[data-dialog-initial-focus]";

export const useDialogAccessibility = (open, onClose, { lockScroll = true } = {}) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;

    if (lockScroll) document.body.style.overflow = "hidden";

    const findInitialFocusTarget = () =>
      dialog.querySelector(INITIAL_FOCUS_SELECTOR) ||
      dialog.querySelector(DIALOG_FOCUSABLE_SELECTOR) ||
      dialog;

    const initialTarget = findInitialFocusTarget();
    initialTarget.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      trapDialogTabKey(event, dialog, document.activeElement);
    };

    const handleFocusIn = (event) => {
      if (dialog.contains(event.target)) return;
      findInitialFocusTarget().focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, lockScroll]);

  return dialogRef;
};
