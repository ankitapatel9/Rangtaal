// Stub hook — Phase 2 will wire this to Firestore
import { TutorialDoc } from "../types/session";

export interface TutorialsState {
  tutorials: TutorialDoc[];
  loading: boolean;
}

export function useTutorials(_sessionId: string | undefined): TutorialsState {
  return { tutorials: [], loading: false };
}
