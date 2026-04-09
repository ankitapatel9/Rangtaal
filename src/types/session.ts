// Session domain types — Phase 2 data model

export interface ClassDoc {
  id: string;
  name: string;
  adminUid: string;
  createdAt: number;
}

export interface SessionDoc {
  id: string;
  classId: string;
  date: number;          // Unix timestamp ms
  time: string;         // e.g. "7:30 – 9:30 PM"
  location: string;
  address?: string;
  rsvpUids: string[];
  cancelled?: boolean;
  cancelReason?: string;
  tutorialCount?: number;
  mediaCount?: number;
}

export interface TutorialDoc {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;      // e.g. "12:34"
  uploaderUid: string;
  uploaderName: string;
  createdAt: number;
  paywalled?: boolean;
}

export interface MediaDoc {
  id: string;
  sessionId: string;
  url: string;
  type: "photo" | "video";
  uploaderUid: string;
  uploaderName: string;
  createdAt: number;
}
