export interface CommentDoc {
  id: string;
  parentId: string;
  parentType: "media" | "tutorial" | "session";
  replyToId: string | null;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}
