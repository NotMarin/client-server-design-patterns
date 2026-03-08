// Entry point — demonstrates the full hospital management system

import { HospitalFacade } from "./facade/HospitalFacade";
import { HospitalConfig } from "./config/HospitalConfig";

function main(): void {
  console.log("=".repeat(60));
  console.log("  HOSPITAL MANAGEMENT SYSTEM — DEMO");
  console.log("=".repeat(60));

  // Initialize the facade (single entry point for all operations)
  const hospital = new HospitalFacade();

  // 1. Show hospital configuration (Singleton)
  console.log("\n--- 1. Hospital Configuration (Singleton) ---");
  console.log(hospital.getHospitalInfo());

  // Update config — reflected globally
  const config = HospitalConfig.getInstance();
  config.updateSettings({ hospitalName: "Hospital Universitario UTP" });
  console.log("Updated config:", hospital.getHospitalInfo());

  // 2. Register patients (Factory Method)
  console.log("\n--- 2. Register Patients (Factory Method) ---");

  const patient1 = hospital.registerPatient({
    name: "Carlos Mendez",
    email: "carlos@email.com",
    phone: "300-111-2222",
    dateOfBirth: "1985-03-15",
    billingType: "insurance",
    insuranceId: "POL-12345",
  });

  const patient2 = hospital.registerPatient({
    name: "Ana Torres",
    email: "ana@email.com",
    phone: "310-333-4444",
    dateOfBirth: "1990-07-22",
    billingType: "private",
  });

  const patient3 = hospital.registerPatient({
    name: "Luis Ramirez",
    email: "luis@email.com",
    phone: "320-555-6666",
    dateOfBirth: "1978-11-08",
    billingType: "agreement",
  });

  console.log(`Total patients: ${hospital.getAllPatients().length}`);

  // 3. Register a doctor (Factory Method)
  console.log("\n--- 3. Register Doctor (Factory Method) ---");

  const doctor = hospital.registerDoctor({
    name: "Dra. Maria Lopez",
    email: "maria.lopez@hospital.com",
    phone: "300-999-8888",
    specialty: "Cardiology",
    licenseNumber: "MED-56789",
  });
  console.log(`Doctor registered: ${doctor.name} — ${doctor.specialty}`);

  // 4. Schedule and confirm appointments (Observer notifications)
  console.log("\n--- 4. Appointments & Notifications (Observer) ---");

  const appt1 = hospital.scheduleAppointment(
    patient1.id,
    doctor.id,
    "2026-03-10",
    "Routine cardiac checkup",
  );

  const appt2 = hospital.scheduleAppointment(
    patient2.id,
    doctor.id,
    "2026-03-10",
    "Chest pain evaluation",
  );

  if (appt1) {
    console.log("\nConfirming appointment 1:");
    hospital.confirmAppointment(appt1.id);
  }

  if (appt2) {
    console.log("\nCancelling appointment 2:");
    hospital.cancelAppointment(appt2.id);
  }

  // 5. Add clinical records
  console.log("\n--- 5. Clinical Records (Repository + Observer) ---");

  hospital.addClinicalRecord({
    patientId: patient1.id,
    doctorId: doctor.id,
    diagnosis: "Mild hypertension",
    treatment: "Losartan 50mg daily",
    notes: "Follow-up in 3 months. Monitor blood pressure.",
  });

  const history = hospital.getPatientHistory(patient1.id);
  console.log(`Clinical records for ${patient1.name}: ${history.length}`);

  // 6. Billing with different strategies
  console.log("\n--- 6. Billing (Strategy) ---");

  if (appt1) {
    // Insurance patient
    const invoice1 = hospital.generateInvoice(patient1.id, appt1.id, 500_000);
    if (invoice1) {
      console.log(
        `  ${patient1.name}: Base=$${invoice1.baseAmount} | Discount=$${invoice1.discount} | Total=$${invoice1.totalAmount}`,
      );
    }
  }

  if (appt2) {
    // Private patient
    const invoice2 = hospital.generateInvoice(patient2.id, appt2.id, 500_000);
    if (invoice2) {
      console.log(
        `  ${patient2.name}: Base=$${invoice2.baseAmount} | Discount=$${invoice2.discount} | Total=$${invoice2.totalAmount}`,
      );
    }
  }

  // Agreement patient — create a separate appointment for demo
  const appt3 = hospital.scheduleAppointment(
    patient3.id,
    doctor.id,
    "2026-03-11",
    "General consultation",
  );
  if (appt3) {
    const invoice3 = hospital.generateInvoice(patient3.id, appt3.id, 500_000);
    if (invoice3) {
      console.log(
        `  ${patient3.name}: Base=$${invoice3.baseAmount} | Discount=$${invoice3.discount} | Total=$${invoice3.totalAmount}`,
      );
    }
  }

  // 7. External insurance integration (Adapter)
  console.log("\n--- 7. Insurance Integration (Adapter) ---");
  const coverageInfo = hospital.verifyInsurance(patient1.id, "POL-12345");
  console.log(`  Coverage: ${coverageInfo}`);

  const claimResult = hospital.submitInsuranceClaim("AUTH-001", 100_000);
  console.log(`  Claim: ${claimResult}`);

  // 8. Summary
  console.log("\n--- 8. Patient Invoice Summary (Repository) ---");
  for (const patient of hospital.getAllPatients()) {
    const invoices = hospital.getPatientInvoices(patient.id);
    const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    console.log(
      `  ${patient.name}: ${invoices.length} invoice(s), Total: $${total}`,
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("  DEMO COMPLETE");
  console.log("=".repeat(60));
}

main();
