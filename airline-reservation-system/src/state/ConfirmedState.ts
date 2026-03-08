import type { ReservationState } from "./ReservationState.js";
import type { Reservation } from "../models/Reservation.js";
import { CancelledState } from "./CancelledState.js";
import { CheckedInState } from "./CheckedInState.js";
import { PendingState } from "./PendingState.js";
import { ReservationEvent } from "../enums/index.js";

// STATE: Confirmed — reservation has been paid and confirmed.
// Allowed transitions: checkIn → CheckedIn, cancel → Cancelled, modify → Pending, upgrade.
export class ConfirmedState implements ReservationState {
  readonly name = "CONFIRMED";

  confirm(_reservation: Reservation): void {
    console.log("  [State] Reservation is already confirmed.");
  }

  cancel(reservation: Reservation): void {
    reservation.seat.release();
    reservation.setState(new CancelledState());
    reservation.notifyObservers(ReservationEvent.CANCELLED);
  }

  checkIn(reservation: Reservation): void {
    reservation.setState(new CheckedInState());
    reservation.notifyObservers(ReservationEvent.CHECKED_IN);
  }

  board(_reservation: Reservation): void {
    console.log("  [State] Cannot board: must check in first.");
  }

  modify(reservation: Reservation): void {
    // Modification reverts the reservation back to pending for re-processing
    reservation.setState(new PendingState());
    reservation.notifyObservers(ReservationEvent.MODIFIED);
  }

  upgrade(reservation: Reservation): void {
    console.log("  [State] Upgrade applied in confirmed state.");
    reservation.notifyObservers(ReservationEvent.UPGRADED);
  }
}
