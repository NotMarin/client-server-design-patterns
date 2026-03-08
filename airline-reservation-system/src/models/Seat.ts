import { SeatClass } from "../enums/index.js";

// Represents an aircraft seat with class and availability tracking
export class Seat {
  constructor(
    public readonly number: string,
    public readonly seatClass: SeatClass,
    public isAvailable: boolean = true,
  ) {}

  reserve(): void {
    this.isAvailable = false;
  }

  release(): void {
    this.isAvailable = true;
  }
}
