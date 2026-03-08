import type { Person } from "./Person";

export interface AdminStaff extends Person {
  readonly role: "admin";
  readonly department: string;
}
