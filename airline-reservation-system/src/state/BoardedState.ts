import type { ReservationState } from "./ReservationState.js";
import type { Reservation } from "../models/Reservation.js";

// STATE: Boarded — terminal state. The passenger has boarded the aircraft.
export class BoardedState implements ReservationState {
  readonly name = "BOARDED";

  confirm(_reservation: Reservation): void {
    console.log("  [State] Cannot confirm: passenger already boarded.");
  }

  cancel(_reservation: Reservation): void {
    console.log("  [State] Cannot cancel: passenger already boarded.");
  }

  checkIn(_reservation: Reservation): void {
    console.log("  [State] Cannot check in: passenger already boarded.");
  }

  board(_reservation: Reservation): void {
    console.log("  [State] Passenger already boarded.");
  }

  modify(_reservation: Reservation): void {
    console.log("  [State] Cannot modify: passenger already boarded.");
  }

  upgrade(_reservation: Reservation): void {
    console.log("  [State] Cannot upgrade: passenger already boarded.");
  }
}
