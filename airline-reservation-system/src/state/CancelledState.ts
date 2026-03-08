import type { ReservationState } from "./ReservationState.js";
import type { Reservation } from "../models/Reservation.js";

// STATE: Cancelled — terminal state. No further operations are allowed.
// Cancelled reservations do not generate additional charges.
export class CancelledState implements ReservationState {
  readonly name = "CANCELLED";

  confirm(_reservation: Reservation): void {
    console.log("  [State] Cannot confirm: reservation is cancelled.");
  }

  cancel(_reservation: Reservation): void {
    console.log("  [State] Reservation is already cancelled.");
  }

  checkIn(_reservation: Reservation): void {
    console.log("  [State] Cannot check in: reservation is cancelled.");
  }

  board(_reservation: Reservation): void {
    console.log("  [State] Cannot board: reservation is cancelled.");
  }

  modify(_reservation: Reservation): void {
    console.log("  [State] Cannot modify: reservation is cancelled.");
  }

  upgrade(_reservation: Reservation): void {
    console.log("  [State] Cannot upgrade: reservation is cancelled.");
  }
}
