"use client";

// A browser-global flag survives App Router route-group remounts but naturally
// resets on a full page reload or a new browser tab/window.
const INITIAL_BOOT_KEY = "__computerHardwareInitialBootComplete";

export function hasCompletedInitialBoot() {
  return typeof window !== "undefined" && window[INITIAL_BOOT_KEY] === true;
}

export function completeInitialBoot() {
  if (typeof window === "undefined") return;
  window[INITIAL_BOOT_KEY] = true;
}
