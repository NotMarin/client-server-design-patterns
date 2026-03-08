import type { ReservationObserver } from "./ReservationObserver.js";
import type { Reservation } from "../models/Reservation.js";
import type { ReservationEvent } from "../enums/index.js";

// OBSERVER: Sends email notifications on reservation events
export class EmailNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void {
    console.log(
      `  [Email] → ${reservation.passenger.email} | Reservation ${reservation.id}: ${event}`,
    );
  }
}
