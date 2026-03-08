// Base interface and types for all people in the hospital system

export type PersonRole = "patient" | "doctor" | "admin";

export interface Person {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: PersonRole;
}
