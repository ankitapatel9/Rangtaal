// Stub hook — Phase 2 will wire this to Firestore
// Returns null until real implementation lands
import { ClassDoc } from "../types/session";

export interface ActiveClassState {
  class_: ClassDoc | null;
  loading: boolean;
}

export function useActiveClass(): ActiveClassState {
  return { class_: null, loading: false };
}
