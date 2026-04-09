// Stub hook — Phase 2 will wire this to Firestore
import { MediaDoc } from "../types/session";

export interface MediaState {
  media: MediaDoc[];
  loading: boolean;
}

export function useMedia(_sessionId: string | undefined): MediaState {
  return { media: [], loading: false };
}
