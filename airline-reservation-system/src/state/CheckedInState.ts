import type { ReservationState } from "./ReservationState.js";
import type { Reservation } from "../models/Reservation.js";
import { CancelledState } from "./CancelledState.js";
import { BoardedState } from "./BoardedState.js";
import { ReservationEvent } from "../enums/index.js";

// STATE: CheckedIn — passenger has completed online or counter check-in.
// Allowed transitions: board → Boarded, cancel → Cancelled.
export class CheckedInState implements ReservationState {
  readonly name = "CHECKED_IN";

  confirm(_reservation: Reservation): void {
    console.log("  [State] Cannot confirm: already checked in.");
  }

  cancel(reservation: Reservation): void {
    reservation.seat.release();
    reservation.setState(new CancelledState());
    reservation.notifyObservers(ReservationEvent.CANCELLED);
  }

  checkIn(_reservation: Reservation): void {
    console.log("  [State] Already checked in.");
  }

  board(reservation: Reservation): void {
    reservation.setState(new BoardedState());
    reservation.notifyObservers(ReservationEvent.BOARDED);
  }

  modify(_reservation: Reservation): void {
    console.log("  [State] Cannot modify after check-in.");
  }

  upgrade(_reservation: Reservation): void {
    console.log("  [State] Cannot upgrade after check-in.");
  }
}
