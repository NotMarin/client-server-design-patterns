import { Reservation } from "../models/Reservation.js";
import { Passenger } from "../models/Passenger.js";
import { Flight } from "../models/Flight.js";
import { Seat } from "../models/Seat.js";
import { AdditionalService } from "../models/AdditionalService.js";
import type { PricingStrategy } from "../strategy/PricingStrategy.js";
import type { ReservationObserver } from "../observer/ReservationObserver.js";
import { PendingState } from "../state/PendingState.js";
import { SeatClass } from "../enums/index.js";
import { EconomyPricing } from "../strategy/EconomyPricing.js";
import { PremiumPricing } from "../strategy/PremiumPricing.js";
import { FirstClassPricing } from "../strategy/FirstClassPricing.js";

// BUILDER PATTERN — Fluent API for constructing complex Reservation objects.
// Avoids telescopic constructors and ensures the final object is consistent.
export class ReservationBuilder {
  private passenger: Passenger | undefined;
  private flight: Flight | undefined;
  private seat: Seat | undefined;
  private basePrice: number | undefined;
  private pricingStrategy: PricingStrategy | undefined;
  private additionalServices: AdditionalService[] = [];
  private observers: ReservationObserver[] = [];

  // Unique reservation ID generated per build
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `RES-${timestamp}-${random}`.toUpperCase();
  }

  setPassenger(
    name: string,
    passport: string,
    email: string,
    phone: string,
  ): this {
    this.passenger = new Passenger(name, passport, email, phone);
    return this;
  }

  setFlight(
    flightNumber: string,
    origin: string,
    destination: string,
    departureDate: Date,
    arrivalDate: Date,
  ): this {
    this.flight = new Flight(
      flightNumber,
      origin,
      destination,
      departureDate,
      arrivalDate,
    );
    return this;
  }

  setSeat(number: string, seatClass: SeatClass): this {
    this.seat = new Seat(number, seatClass);
    return this;
  }

  setBasePrice(price: number): this {
    this.basePrice = price;
    return this;
  }

  setPricingStrategy(strategy: PricingStrategy): this {
    this.pricingStrategy = strategy;
    return this;
  }

  addService(name: string, price: number): this {
    this.additionalServices.push(new AdditionalService(name, price));
    return this;
  }

  addObserver(observer: ReservationObserver): this {
    this.observers.push(observer);
    return this;
  }

  // Validates all required fields and assembles the Reservation
  build(): Reservation {
    if (!this.passenger) throw new Error("Passenger is required");
    if (!this.flight) throw new Error("Flight is required");
    if (!this.seat) throw new Error("Seat is required");
    if (this.basePrice === undefined) throw new Error("Base price is required");

    // Default pricing strategy based on seat class if not explicitly set
    const strategy =
      this.pricingStrategy ?? this.resolveDefaultStrategy(this.seat.seatClass);

    this.seat.reserve();

    const reservation = new Reservation(
      this.generateId(),
      this.passenger,
      this.flight,
      this.seat,
      this.basePrice,
      [...this.additionalServices],
      strategy,
      new PendingState(),
    );

    for (const observer of this.observers) {
      reservation.addObserver(observer);
    }

    return reservation;
  }

  // Infers a default pricing strategy from the seat class
  private resolveDefaultStrategy(seatClass: SeatClass): PricingStrategy {
    switch (seatClass) {
      case SeatClass.ECONOMY:
        return new EconomyPricing();
      case SeatClass.PREMIUM:
        return new PremiumPricing();
      case SeatClass.FIRST_CLASS:
        return new FirstClassPricing();
    }
  }
}
