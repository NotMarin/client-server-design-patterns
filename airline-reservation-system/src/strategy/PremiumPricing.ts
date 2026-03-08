import type { PricingStrategy } from "./PricingStrategy.js";
import type { Reservation } from "../models/Reservation.js";
import { Season } from "../enums/index.js";

// STRATEGY: Premium pricing — 2x base with season adjustments, no anticipation discount
export class PremiumPricing implements PricingStrategy {
  readonly name = "PremiumPricing";

  private static readonly CLASS_MULTIPLIER = 2.0;

  calculatePrice(basePrice: number, reservation: Reservation): number {
    const seasonMultiplier = this.getSeasonMultiplier(
      reservation.flight.departureDate,
    );
    return basePrice * PremiumPricing.CLASS_MULTIPLIER * seasonMultiplier;
  }

  private getSeasonMultiplier(departureDate: Date): number {
    const season = this.determineSeason(departureDate);
    switch (season) {
      case Season.HIGH:
        return 1.4;
      case Season.REGULAR:
        return 1.1;
      case Season.LOW:
        return 0.9;
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
