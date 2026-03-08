// Represents a passenger with personal and contact information
export class Passenger {
  constructor(
    public readonly name: string,
    public readonly passport: string,
    public readonly email: string,
    public readonly phone: string,
  ) {}
}
