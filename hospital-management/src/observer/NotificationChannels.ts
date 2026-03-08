// Concrete observer implementations for different notification channels

import type { ClinicalEvent, ClinicalObserver } from "./ClinicalEventEmitter";

// Simulates sending an email notification
export class EmailNotifier implements ClinicalObserver {
  readonly channelName = "email";

  update(event: ClinicalEvent): void {
    console.log(
      `[EMAIL] To patient ${event.patientId}: ${event.message} (${event.type})`,
    );
  }
}

// Simulates sending an SMS notification
export class SmsNotifier implements ClinicalObserver {
  readonly channelName = "sms";

  update(event: ClinicalEvent): void {
    console.log(
      `[SMS] To patient ${event.patientId}: ${event.message} (${event.type})`,
    );
  }
}

// Push notification channel — ready for future mobile app integration
export class PushNotifier implements ClinicalObserver {
  readonly channelName = "push";

  update(event: ClinicalEvent): void {
    console.log(
      `[PUSH] To patient ${event.patientId}: ${event.message} (${event.type})`,
    );
  }
}
