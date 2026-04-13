export type SessionStatus = "upcoming" | "completed" | "cancelled";

export interface SessionDoc {
  id: string;
  classId: string;
  date: string;              // ISO 8601 — session start datetime
  status: SessionStatus;
  rsvps: string[];           // array of participant userIds
  customMessage: string | null;
  cancellationReason: string | null;
  cancelledAt: number | null;
  cancelledBy: string | null;
  reminderSent: {
    dayBefore: boolean;
    dayOf: boolean;
  };
  topic: string | null;
  topicDescription: string | null;
}
