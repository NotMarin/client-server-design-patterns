import type { ReservationState } from "./ReservationState.js";
import type { Reservation } from "../models/Reservation.js";
import { ConfirmedState } from "./ConfirmedState.js";
import { CancelledState } from "./CancelledState.js";
import { ReservationEvent } from "../enums/index.js";

// STATE: Pending — the initial state after a reservation is built.
// Allowed transitions: confirm → Confirmed, cancel → Cancelled, modify, upgrade.
export class PendingState implements ReservationState {
  readonly name = "PENDING";

  confirm(reservation: Reservation): void {
    reservation.setState(new ConfirmedState());
    reservation.notifyObservers(ReservationEvent.CONFIRMED);
  }

  cancel(reservation: Reservation): void {
    reservation.seat.release();
    reservation.setState(new CancelledState());
    reservation.notifyObservers(ReservationEvent.CANCELLED);
  }

  checkIn(_reservation: Reservation): void {
    console.log("  [State] Cannot check in: reservation is still pending.");
  }

  board(_reservation: Reservation): void {
    console.log("  [State] Cannot board: reservation is still pending.");
  }

  modify(reservation: Reservation): void {
    console.log("  [State] Modification allowed in pending state.");
    reservation.notifyObservers(ReservationEvent.MODIFIED);
  }

  upgrade(reservation: Reservation): void {
    console.log("  [State] Upgrade applied in pending state.");
    reservation.notifyObservers(ReservationEvent.UPGRADED);
  }
}
