import type { Reservation } from "../models/Reservation.js";

// STRATEGY PATTERN - Interface
// Encapsulates a pricing algorithm; different strategies compute the final price differently
export interface PricingStrategy {
  readonly name: string;
  calculatePrice(basePrice: number, reservation: Reservation): number;
}
