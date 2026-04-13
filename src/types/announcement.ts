export interface AnnouncementDoc {
  id: string;
  text: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number | null;  // auto-hide after this time, null = manual
  active: boolean;
}
