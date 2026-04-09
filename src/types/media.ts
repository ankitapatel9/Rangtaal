export interface MediaDoc {
  id: string;
  sessionId: string;
  type: "photo" | "video";
  storageUrl: string;
  uploadedBy: string;
  uploadedAt: number;
  comments: null;
  tags: null;
  analysis: null;
}

export interface CreateMediaInput {
  sessionId: string;
  type: "photo" | "video";
  storageUrl: string;
  uploadedBy: string;
}
