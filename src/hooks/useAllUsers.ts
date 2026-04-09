// Stub hook — Phase 2 will wire this to Firestore
import { UserDoc } from "../types/user";

export interface AllUsersState {
  users: UserDoc[];
  loading: boolean;
}

export function useAllUsers(): AllUsersState {
  return { users: [], loading: false };
}
