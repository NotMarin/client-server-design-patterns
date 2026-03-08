import type { Reservation } from "../models/Reservation.js";

// STATE PATTERN - Interface
// Each state defines the allowed operations for a reservation in that lifecycle phase
export interface ReservationState {
  readonly name: string;
  confirm(reservation: Reservation): void;
  cancel(reservation: Reservation): void;
  checkIn(reservation: Reservation): void;
  board(reservation: Reservation): void;
  modify(reservation: Reservation): void;
  upgrade(reservation: Reservation): void;
}
