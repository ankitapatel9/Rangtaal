export interface TutorialDoc {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  videoUrl: string;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: number;
  createdBy: string;
  order: number;
}

export interface CreateTutorialInput {
  sessionId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdBy: string;
  order: number;
}
