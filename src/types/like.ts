export interface LikeDoc {
  id: string;
  parentId: string;
  parentType: "media" | "tutorial" | "comment";
  userId: string;
  createdAt: number;
}
