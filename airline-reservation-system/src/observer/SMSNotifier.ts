import type { ReservationObserver } from "./ReservationObserver.js";
import type { Reservation } from "../models/Reservation.js";
import type { ReservationEvent } from "../enums/index.js";

// OBSERVER: Sends SMS notifications on reservation events
export class SMSNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void {
    console.log(
      `  [SMS]   → ${reservation.passenger.phone} | Reservation ${reservation.id}: ${event}`,
    );
  }
}
