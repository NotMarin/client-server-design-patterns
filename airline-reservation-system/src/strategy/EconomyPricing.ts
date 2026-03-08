import type { PricingStrategy } from "./PricingStrategy.js";
import type { Reservation } from "../models/Reservation.js";
import { Season } from "../enums/index.js";

// STRATEGY: Economy pricing — applies season and early-purchase discounts
export class EconomyPricing implements PricingStrategy {
  readonly name = "EconomyPricing";

  calculatePrice(basePrice: number, reservation: Reservation): number {
    const seasonMultiplier = this.getSeasonMultiplier(
      reservation.flight.departureDate,
    );
    const anticipationDiscount = this.getAnticipationDiscount(
      reservation.flight.departureDate,
    );
    return basePrice * seasonMultiplier * (1 - anticipationDiscount);
  }

  private getSeasonMultiplier(departureDate: Date): number {
    const season = this.determineSeason(departureDate);
    switch (season) {
      case Season.HIGH:
        return 1.3;
      case Season.REGULAR:
        return 1.0;
      case Season.LOW:
        return 0.8;
    }
  }

  // Discount based on how many days in advance the ticket is purchased
  private getAnticipationDiscount(departureDate: Date): number {
    const daysAhead = Math.floor(
      (departureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysAhead > 60) return 0.15;
    if (daysAhead > 30) return 0.1;
    if (daysAhead > 14) return 0.05;
    return 0;
  }

  private determineSeason(date: Date): Season {
    const month = date.getMonth() + 1;
    if (month === 12 || month === 1 || month === 7 || month === 8)
      return Season.HIGH;
    if (month >= 3 && month <= 5) return Season.LOW;
    return Season.REGULAR;
  }
}
