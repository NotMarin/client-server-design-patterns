import { ReservationBuilder } from "./builder/ReservationBuilder.js";
import { EmailNotifier } from "./observer/EmailNotifier.js";
import { SMSNotifier } from "./observer/SMSNotifier.js";
import { AppNotifier } from "./observer/AppNotifier.js";
import { EconomyPricing } from "./strategy/EconomyPricing.js";
import { PremiumPricing } from "./strategy/PremiumPricing.js";
import { FirstClassPricing } from "./strategy/FirstClassPricing.js";
import { Seat } from "./models/Seat.js";
import { SeatClass } from "./enums/index.js";

// ─────────────────────────────────────────────────────────────
// AIRLINE RESERVATION SYSTEM — Full demonstration
// Patterns: Builder · Strategy · State · Observer
// ─────────────────────────────────────────────────────────────

function separator(title: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ── 1. BUILD a reservation using the Builder pattern ────────
separator("1. BUILDER — Constructing a complex reservation");

const reservation = new ReservationBuilder()
  .setPassenger(
    "Carlos Méndez",
    "PA-12345678",
    "carlos.mendez@email.com",
    "+507-6543-2100",
  )
  .setFlight(
    "AV-204",
    "Tocumen (PTY)",
    "Bogotá (BOG)",
    new Date("2026-07-15T06:30:00"),
    new Date("2026-07-15T09:45:00"),
  )
  .setSeat("12A", SeatClass.ECONOMY)
  .setBasePrice(350)
  .addService("Extra luggage (23 kg)", 45)
  .addService("In-flight meal", 18)
  .addService("Wi-Fi access", 12)
  .addObserver(new EmailNotifier())
  .addObserver(new SMSNotifier())
  .addObserver(new AppNotifier())
  .build();

console.log(`Reservation ID : ${reservation.id}`);
console.log(`Passenger      : ${reservation.passenger.name}`);
console.log(
  `Flight         : ${reservation.flight.flightNumber} (${reservation.flight.origin} → ${reservation.flight.destination})`,
);
console.log(
  `Seat           : ${reservation.seat.number} [${reservation.seat.seatClass}]`,
);
console.log(`State          : ${reservation.getStateName()}`);

// ── 2. STRATEGY — Dynamic price calculation ────────────────
separator("2. STRATEGY — Price calculation with different algorithms");

console.log(`\nEconomy pricing:`);
reservation.setPricingStrategy(new EconomyPricing());
console.log(
  `  Base: $350 | Total: $${reservation.calculateTotalPrice().toFixed(2)}`,
);

console.log(`\nPremium pricing:`);
reservation.setPricingStrategy(new PremiumPricing());
console.log(
  `  Base: $350 | Total: $${reservation.calculateTotalPrice().toFixed(2)}`,
);

console.log(`\nFirst-Class pricing:`);
reservation.setPricingStrategy(new FirstClassPricing());
console.log(
  `  Base: $350 | Total: $${reservation.calculateTotalPrice().toFixed(2)}`,
);

// Reset to economy for the rest of the demo
reservation.setPricingStrategy(new EconomyPricing());

// ── 3. STATE — Full reservation lifecycle ───────────────────
separator("3. STATE — Reservation lifecycle transitions");

console.log(`\nCurrent state: ${reservation.getStateName()}`);

console.log(`\n→ Attempting invalid check-in while PENDING:`);
reservation.checkIn();

console.log(`\n→ Confirming reservation:`);
reservation.confirm();
console.log(`  State: ${reservation.getStateName()}`);

console.log(`\n→ Modifying confirmed reservation (returns to PENDING):`);
reservation.modify();
console.log(`  State: ${reservation.getStateName()}`);

console.log(`\n→ Re-confirming after modification:`);
reservation.confirm();
console.log(`  State: ${reservation.getStateName()}`);

console.log(`\n→ Checking in:`);
reservation.checkIn();
console.log(`  State: ${reservation.getStateName()}`);

console.log(`\n→ Attempting modification after check-in:`);
reservation.modify();

console.log(`\n→ Boarding:`);
reservation.board();
console.log(`  State: ${reservation.getStateName()}`);

console.log(`\n→ Attempting cancel after boarding:`);
reservation.cancel();

// ── 4. OBSERVER — Notifications on a new reservation ─────────
separator("4. OBSERVER — Notification channels on a second reservation");

const reservation2 = new ReservationBuilder()
  .setPassenger(
    "Ana Torres",
    "PA-87654321",
    "ana.torres@email.com",
    "+507-6789-0000",
  )
  .setFlight(
    "CM-801",
    "Tocumen (PTY)",
    "Ciudad de México (MEX)",
    new Date("2026-08-20T14:00:00"),
    new Date("2026-08-20T19:30:00"),
  )
  .setSeat("3F", SeatClass.PREMIUM)
  .setBasePrice(620)
  .addService("Priority boarding", 30)
  .addObserver(new EmailNotifier())
  .addObserver(new SMSNotifier())
  .addObserver(new AppNotifier())
  .build();

console.log(`\nReservation ID : ${reservation2.id}`);
console.log(`State          : ${reservation2.getStateName()}`);
console.log(
  `Total price    : $${reservation2.calculateTotalPrice().toFixed(2)}`,
);

console.log(`\n→ Confirming (all 3 channels notified):`);
reservation2.confirm();

console.log(`\n→ Cancelling (all 3 channels notified):`);
reservation2.cancel();

console.log(`\n→ Attempting confirm on cancelled reservation:`);
reservation2.confirm();

// ── 5. UPGRADE — Seat class upgrade with strategy swap ───────
separator("5. UPGRADE — Upgrading seat class and pricing strategy");

const reservation3 = new ReservationBuilder()
  .setPassenger(
    "Luis Herrera",
    "PA-11223344",
    "luis.herrera@email.com",
    "+507-6111-2222",
  )
  .setFlight(
    "AV-510",
    "Tocumen (PTY)",
    "Miami (MIA)",
    new Date("2026-12-22T08:00:00"),
    new Date("2026-12-22T13:00:00"),
  )
  .setSeat("22C", SeatClass.ECONOMY)
  .setBasePrice(480)
  .setPricingStrategy(new EconomyPricing())
  .addObserver(new EmailNotifier())
  .addObserver(new AppNotifier())
  .build();

console.log(`\nBefore upgrade:`);
console.log(
  `  Seat: ${reservation3.seat.number} [${reservation3.seat.seatClass}]`,
);
console.log(`  Strategy: ${reservation3.pricingStrategy.name}`);
console.log(`  Total: $${reservation3.calculateTotalPrice().toFixed(2)}`);

// Perform upgrade: change seat and pricing strategy
console.log(`\n→ Upgrading to First Class:`);
reservation3.seat = new Seat("2A", SeatClass.FIRST_CLASS, false);
reservation3.setPricingStrategy(new FirstClassPricing());
reservation3.upgrade();

console.log(`\nAfter upgrade:`);
console.log(
  `  Seat: ${reservation3.seat.number} [${reservation3.seat.seatClass}]`,
);
console.log(`  Strategy: ${reservation3.pricingStrategy.name}`);
console.log(`  Total: $${reservation3.calculateTotalPrice().toFixed(2)}`);

// ── Summary ──────────────────────────────────────────────────
separator("DEMO COMPLETE");
console.log(`
  Patterns demonstrated:
    • Builder    — Fluent construction of complex Reservation objects
    • Strategy   — Dynamic pricing (Economy / Premium / First Class)
    • State      — Lifecycle management (Pending → Confirmed → CheckedIn → Boarded)
    • Observer   — Multi-channel notifications (Email, SMS, App)
`);
