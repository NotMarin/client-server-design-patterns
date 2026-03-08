// Observer pattern: decouples event producers from notification consumers
// New channels (push notifications, webhooks) can be added without modifying emitters

export type ClinicalEventType =
  | "appointment:confirmed"
  | "appointment:cancelled"
  | "medication:reminder"
  | "clinical:update"
  | "emergency:alert";

export interface ClinicalEvent {
  readonly type: ClinicalEventType;
  readonly patientId: string;
  readonly doctorId?: string;
  readonly message: string;
  readonly timestamp: Date;
}

// Observer interface — each notification channel implements this
export interface ClinicalObserver {
  readonly channelName: string;
  update(event: ClinicalEvent): void;
}

// Subject that manages observers and dispatches events
export class ClinicalEventEmitter {
  private observers: Map<ClinicalEventType, ClinicalObserver[]> = new Map();

  subscribe(eventType: ClinicalEventType, observer: ClinicalObserver): void {
    const existing = this.observers.get(eventType) ?? [];
    existing.push(observer);
    this.observers.set(eventType, existing);
  }

  unsubscribe(eventType: ClinicalEventType, observer: ClinicalObserver): void {
    const existing = this.observers.get(eventType);
    if (!existing) return;
    this.observers.set(
      eventType,
      existing.filter((o) => o !== observer),
    );
  }

  emit(event: ClinicalEvent): void {
    const observers = this.observers.get(event.type) ?? [];
    for (const observer of observers) {
      observer.update(event);
    }
  }
}
