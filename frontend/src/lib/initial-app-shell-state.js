let initialAppShellReady = false;

export function isInitialAppShellReady() {
  return initialAppShellReady;
}

export function markInitialAppShellReady() {
  initialAppShellReady = true;
}
