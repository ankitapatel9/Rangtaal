export type UserRole = "participant" | "admin";

export interface UserDoc {
  uid: string;
  name: string;
  phoneNumber: string;
  role: UserRole;
  paid?: boolean;
  fcmToken?: string;
  createdAt: number;
  paid: boolean;
  fcmToken: string | null;
}

export interface NewUserInput {
  uid: string;
  name: string;
  phoneNumber: string;
}
