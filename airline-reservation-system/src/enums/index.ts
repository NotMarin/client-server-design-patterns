// Centralized enumerations for the airline reservation system

export enum SeatClass {
  ECONOMY = "ECONOMY",
  PREMIUM = "PREMIUM",
  FIRST_CLASS = "FIRST_CLASS",
}

export enum ReservationEvent {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  CHECKED_IN = "CHECKED_IN",
  BOARDED = "BOARDED",
  MODIFIED = "MODIFIED",
  UPGRADED = "UPGRADED",
}

export enum Season {
  LOW = "LOW",
  REGULAR = "REGULAR",
  HIGH = "HIGH",
}
