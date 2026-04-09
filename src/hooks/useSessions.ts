// Stub hook — Phase 2 will wire this to Firestore
import { SessionDoc } from "../types/session";

export interface SessionsState {
  sessions: SessionDoc[];
  loading: boolean;
}

export function useSessions(_classId: string | undefined): SessionsState {
  return { sessions: [], loading: false };
}
