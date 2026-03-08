// Singleton: ensures a single global configuration instance for the hospital
// Any module can read/update config and changes propagate everywhere

export interface HospitalSettings {
  hospitalName: string;
  operatingHours: { open: string; close: string };
  emergencyPhone: string;
  maxAppointmentsPerDay: number;
}

export class HospitalConfig {
  private static instance: HospitalConfig | null = null;
  private settings: HospitalSettings;

  private constructor() {
    // Default configuration values
    this.settings = {
      hospitalName: "Hospital Central UTP",
      operatingHours: { open: "07:00", close: "19:00" },
      emergencyPhone: "911",
      maxAppointmentsPerDay: 50,
    };
  }

  static getInstance(): HospitalConfig {
    if (!HospitalConfig.instance) {
      HospitalConfig.instance = new HospitalConfig();
    }
    return HospitalConfig.instance;
  }

  getSettings(): Readonly<HospitalSettings> {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<HospitalSettings>): void {
    this.settings = { ...this.settings, ...partial };
  }

  // Useful for testing — resets the singleton
  static resetInstance(): void {
    HospitalConfig.instance = null;
  }
}
