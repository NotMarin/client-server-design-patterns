// Represents a scheduled flight between two airports
export class Flight {
  constructor(
    public readonly flightNumber: string,
    public readonly origin: string,
    public readonly destination: string,
    public readonly departureDate: Date,
    public readonly arrivalDate: Date,
  ) {}
}
