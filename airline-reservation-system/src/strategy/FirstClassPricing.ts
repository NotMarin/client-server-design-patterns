import type { PricingStrategy } from "./PricingStrategy.js";
import type { Reservation } from "../models/Reservation.js";
import { Season } from "../enums/index.js";

// STRATEGY: First-class pricing — 4x base with larger season surcharges, no discounts
export class FirstClassPricing implements PricingStrategy {
  readonly name = "FirstClassPricing";

  private static readonly CLASS_MULTIPLIER = 4.0;

  calculatePrice(basePrice: number, reservation: Reservation): number {
    const seasonMultiplier = this.getSeasonMultiplier(
      reservation.flight.departureDate,
    );
    return basePrice * FirstClassPricing.CLASS_MULTIPLIER * seasonMultiplier;
  }

  private getSeasonMultiplier(departureDate: Date): number {
    const season = this.determineSeason(departureDate);
    switch (season) {
      case Season.HIGH:
        return 1.5;
      case Season.REGULAR:
        return 1.2;
      case Season.LOW:
        return 1.0;
    }
  }

  private determineSeason(date: Date): Season {
    const month = date.getMonth() + 1;
    if (month === 12 || month === 1 || month === 7 || month === 8)
      return Season.HIGH;
    if (month >= 3 && month <= 5) return Season.LOW;
    return Season.REGULAR;
  }
}
