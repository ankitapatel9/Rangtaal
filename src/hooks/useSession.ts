// Stub hook — Phase 2 will wire this to Firestore
import { SessionDoc } from "../types/session";

export interface SessionState {
  session: SessionDoc | null;
  loading: boolean;
}

export function useSession(_id: string | undefined): SessionState {
  return { session: null, loading: false };
}
