import type { ReservationState } from "../state/ReservationState.js";
import type { PricingStrategy } from "../strategy/PricingStrategy.js";
import type { ReservationObserver } from "../observer/ReservationObserver.js";
import type { Passenger } from "./Passenger.js";
import type { Flight } from "./Flight.js";
import type { Seat } from "./Seat.js";
import type { AdditionalService } from "./AdditionalService.js";
import type { ReservationEvent } from "../enums/index.js";

// Core domain object that integrates all four design patterns:
// - State: delegates lifecycle operations to the current state
// - Strategy: delegates price calculation to the active pricing strategy
// - Observer: notifies registered observers on reservation events
// - Builder: constructed via ReservationBuilder (fluent API)
export class Reservation {
  private state: ReservationState;
  private readonly observers: ReservationObserver[] = [];

  constructor(
    public readonly id: string,
    public readonly passenger: Passenger,
    public readonly flight: Flight,
    public seat: Seat,
    public readonly basePrice: number,
    public readonly additionalServices: AdditionalService[],
    public pricingStrategy: PricingStrategy,
    initialState: ReservationState,
  ) {
    this.state = initialState;
  }

  // --- State pattern delegation ---

  confirm(): void {
    this.state.confirm(this);
  }

  cancel(): void {
    this.state.cancel(this);
  }

  checkIn(): void {
    this.state.checkIn(this);
  }

  board(): void {
    this.state.board(this);
  }

  modify(): void {
    this.state.modify(this);
  }

  upgrade(): void {
    this.state.upgrade(this);
  }

  setState(newState: ReservationState): void {
    console.log(`  [State] ${this.state.name} → ${newState.name}`);
    this.state = newState;
  }

  getStateName(): string {
    return this.state.name;
  }

  // --- Observer pattern ---

  addObserver(observer: ReservationObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: ReservationObserver): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  notifyObservers(event: ReservationEvent): void {
    for (const observer of this.observers) {
      observer.update(event, this);
    }
  }

  // --- Strategy pattern delegation ---

  calculateTotalPrice(): number {
    const strategyPrice = this.pricingStrategy.calculatePrice(
      this.basePrice,
      this,
    );
    const servicesTotal = this.additionalServices.reduce(
      (sum, service) => sum + service.price,
      0,
    );
    return strategyPrice + servicesTotal;
  }

  setPricingStrategy(strategy: PricingStrategy): void {
    console.log(
      `  [Strategy] Pricing changed: ${this.pricingStrategy.name} → ${strategy.name}`,
    );
    this.pricingStrategy = strategy;
  }
}
