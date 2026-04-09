export interface ClassDoc {
  id: string;
  name: string;
  location: string;
  address: string;
  dayOfWeek: "Tuesday";
  startTime: string;      // "19:30"
  endTime: string;        // "21:30"
  monthlyFee: number;     // 60
  seasonStart: string;    // ISO 8601, e.g. "2026-04-21T19:30:00-05:00"
  seasonEnd: string;      // ISO 8601
  active: boolean;
  createdAt: number;      // epoch ms; server timestamp at write
  createdBy: string;      // admin userId
}
