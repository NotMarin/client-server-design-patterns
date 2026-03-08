// Represents an optional add-on service for a reservation (e.g., extra luggage, meal, Wi-Fi)
export class AdditionalService {
  constructor(
    public readonly name: string,
    public readonly price: number,
  ) {}
}
