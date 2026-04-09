export type SessionStatus = "upcoming" | "cancelled";

export interface ReminderSent {
  dayBefore: boolean;
  dayOf: boolean;
}

export interface SessionDoc {
  id: string;
  date: string;
  time: string;
  location: string;
  status: SessionStatus;
  rsvps: string[];
  reminderSent: ReminderSent;
  cancellationReason?: string;
  cancelledAt?: number;
  cancelledBy?: string;
}
