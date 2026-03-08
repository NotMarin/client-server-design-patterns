import type { Reservation } from "../models/Reservation.js";
import type { ReservationEvent } from "../enums/index.js";

// OBSERVER PATTERN - Interface
// Observers are notified whenever a reservation event occurs
export interface ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void;
}
