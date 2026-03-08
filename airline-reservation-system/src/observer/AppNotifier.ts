import type { ReservationObserver } from "./ReservationObserver.js";
import type { Reservation } from "../models/Reservation.js";
import type { ReservationEvent } from "../enums/index.js";

// OBSERVER: Sends push notifications to the mobile app
export class AppNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void {
    console.log(
      `  [App]   → ${reservation.passenger.name} | Reservation ${reservation.id}: ${event}`,
    );
  }
}
