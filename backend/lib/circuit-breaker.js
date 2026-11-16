export const createCircuitBreaker = ({
  failureThreshold = 3,
  resetTimeoutMs = 5000,
  now = () => Date.now(),
} = {}) => {
  if (!Number.isInteger(failureThreshold) || failureThreshold < 1) {
    throw new TypeError("failureThreshold must be a positive integer");
  }
  if (!Number.isFinite(resetTimeoutMs) || resetTimeoutMs < 1) {
    throw new TypeError("resetTimeoutMs must be a positive number");
  }

  let consecutiveFailures = 0;
  let openedAt = 0;
  let probeInFlight = false;

  return {
    async execute(operation) {
      const currentTime = now();
      const isOpen = openedAt > 0;
      if (isOpen && currentTime - openedAt < resetTimeoutMs) {
        return { ok: false, skipped: true, state: "open" };
      }
      if (isOpen && probeInFlight) {
        return { ok: false, skipped: true, state: "half-open" };
      }

      const isProbe = isOpen;
      if (isProbe) probeInFlight = true;
      try {
        const value = await operation();
        consecutiveFailures = 0;
        openedAt = 0;
        return { ok: true, value, state: "closed" };
      } catch (error) {
        consecutiveFailures = isProbe ? failureThreshold : consecutiveFailures + 1;
        if (consecutiveFailures >= failureThreshold) openedAt = now();
        return { ok: false, error, skipped: false, state: openedAt ? "open" : "closed" };
      } finally {
        if (isProbe) probeInFlight = false;
      }
    },
  };
};
