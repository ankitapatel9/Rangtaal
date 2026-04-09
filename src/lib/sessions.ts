// Stub lib functions — Phase 2 will implement these with Firestore

export async function rsvpToSession(
  _sessionId: string,
  _userId: string
): Promise<void> {
  // Phase 2 implementation
}

export async function removeRsvp(
  _sessionId: string,
  _userId: string
): Promise<void> {
  // Phase 2 implementation
}

export async function cancelSession(
  _sessionId: string,
  _reason: string,
  _adminUid: string
): Promise<void> {
  // Phase 2 implementation
}

export async function createTutorial(_input: {
  sessionId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  uploaderUid: string;
  uploaderName: string;
}): Promise<void> {
  // Phase 2 implementation
}

export async function deleteTutorial(_id: string): Promise<void> {
  // Phase 2 implementation
}

export async function createMedia(_input: {
  sessionId: string;
  url: string;
  type: "photo" | "video";
  uploaderUid: string;
  uploaderName: string;
}): Promise<void> {
  // Phase 2 implementation
}

export async function deleteMedia(_id: string): Promise<void> {
  // Phase 2 implementation
}
