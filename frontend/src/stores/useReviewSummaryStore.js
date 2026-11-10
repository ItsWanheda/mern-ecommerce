import { create } from "zustand";
import axios from "../lib/axios.js";

let pendingIds = new Set();
let flushScheduled = false;

export const isReviewSummaryProductId = (value) =>
  new RegExp("^[a-f0-9]{24}$", "i").test(String(value || ""));

const scheduleFlush = (set) => {
  if (flushScheduled) return;
  flushScheduled = true;

  Promise.resolve().then(async () => {
    while (pendingIds.size > 0) {
      const ids = Array.from(pendingIds).slice(0, 48);
      ids.forEach((id) => pendingIds.delete(id));
      try {
        const { data } = await axios.get("/reviews/summaries", { params: { ids: ids.join(",") } });
        const summaries = data?.summaries && typeof data.summaries === "object" ? data.summaries : {};
        set((state) => ({
          summaries: { ...state.summaries, ...summaries },
          loading: { ...state.loading, ...Object.fromEntries(ids.map((id) => [id, false])) },
        }));
      } catch {
        set((state) => ({
          loading: { ...state.loading, ...Object.fromEntries(ids.map((id) => [id, false])) },
        }));
      }
    }
    flushScheduled = false;
    if (pendingIds.size > 0) scheduleFlush(set);
  });
};

export const useReviewSummaryStore = create((set, get) => ({
  summaries: {},
  loading: {},
  requestSummary: (productId) => {
    const id = String(productId || "");
    if (!isReviewSummaryProductId(id)) return;
    if (get().summaries[id] || get().loading[id] || pendingIds.has(id)) return;
    pendingIds.add(id);
    set((state) => ({ loading: { ...state.loading, [id]: true } }));
    scheduleFlush(set);
  },
}));
