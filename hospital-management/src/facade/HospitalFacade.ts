// Facade pattern: provides a single, simplified entry point for the entire hospital system
// Hides complexity of factories, repositories, observers, strategies, and adapters

import { randomUUID } from "node:crypto";
import type { Patient, BillingType } from "../models/Patient";
import type { Doctor } from "../models/Doctor";
import type { Appointment } from "../models/Appointment";
import type { ClinicalRecord } from "../models/ClinicalRecord";
import type { Invoice } from "../models/Invoice";
import { PersonFactory } from "../factory/PersonFactory";
import { HospitalConfig } from "../config/HospitalConfig";
import {
  ClinicalEventEmitter,
  type ClinicalEvent,
} from "../observer/ClinicalEventEmitter";
import { EmailNotifier, SmsNotifier } from "../observer/NotificationChannels";
import {
  BillingContext,
  PrivateBilling,
  InsuranceBilling,
  AgreementBilling,
} from "../strategy/BillingStrategy";
import { ExternalInsuranceAPI } from "../adapter/ExternalInsuranceAPI";
import {
  InsuranceAdapter,
  type InsurancePort,
} from "../adapter/InsuranceAdapter";
import { PatientRepository } from "../repository/PatientRepository";
import { AppointmentRepository } from "../repository/AppointmentRepository";
import { ClinicalRecordRepository } from "../repository/ClinicalRecordRepository";
import { InvoiceRepository } from "../repository/InvoiceRepository";

export class HospitalFacade {
  private readonly config: HospitalConfig;
  private readonly eventEmitter: ClinicalEventEmitter;
  private readonly insuranceAdapter: InsurancePort;
  private readonly patientRepo: PatientRepository;
  private readonly appointmentRepo: AppointmentRepository;
  private readonly clinicalRepo: ClinicalRecordRepository;
  private readonly invoiceRepo: InvoiceRepository;

  constructor() {
    // Singleton config
    this.config = HospitalConfig.getInstance();

    // Observer setup — register default notification channels
    this.eventEmitter = new ClinicalEventEmitter();
    const emailNotifier = new EmailNotifier();
    const smsNotifier = new SmsNotifier();
    this.eventEmitter.subscribe("appointment:confirmed", emailNotifier);
    this.eventEmitter.subscribe("appointment:confirmed", smsNotifier);
    this.eventEmitter.subscribe("appointment:cancelled", emailNotifier);
    this.eventEmitter.subscribe("clinical:update", emailNotifier);
    this.eventEmitter.subscribe("medication:reminder", smsNotifier);
    this.eventEmitter.subscribe("emergency:alert", emailNotifier);
    this.eventEmitter.subscribe("emergency:alert", smsNotifier);

    // Adapter for external insurance system
    this.insuranceAdapter = new InsuranceAdapter(new ExternalInsuranceAPI());

    // Repositories
    this.patientRepo = new PatientRepository();
    this.appointmentRepo = new AppointmentRepository();
    this.clinicalRepo = new ClinicalRecordRepository();
    this.invoiceRepo = new InvoiceRepository();
  }

  // --- Configuration ---

  getHospitalInfo(): string {
    const settings = this.config.getSettings();
    return `${settings.hospitalName} | Hours: ${settings.operatingHours.open}-${settings.operatingHours.close} | Emergency: ${settings.emergencyPhone}`;
  }

  // --- Patient Management ---

  registerPatient(data: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    billingType: BillingType;
    insuranceId?: string;
  }): Patient {
    const person = PersonFactory.create({ role: "patient", data });
    const patient = person as Patient;
    this.patientRepo.save(patient);
    console.log(
      `[HOSPITAL] Patient registered: ${patient.name} (${patient.id})`,
    );
    return patient;
  }

  getPatient(id: string): Patient | undefined {
    return this.patientRepo.findById(id);
  }

  getAllPatients(): Patient[] {
    return this.patientRepo.findAll();
  }

  // --- Doctor Management ---

  registerDoctor(data: {
    name: string;
    email: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
  }): Doctor {
    const person = PersonFactory.create({ role: "doctor", data });
    return person as Doctor;
  }

  // --- Appointment Scheduling ---

  scheduleAppointment(
    patientId: string,
    doctorId: string,
    date: string,
    reason: string,
  ): Appointment | null {
    const patient = this.patientRepo.findById(patientId);
    if (!patient) {
      console.log(`[HOSPITAL] Patient ${patientId} not found`);
      return null;
    }

    // Check daily appointment limit
    const dailyAppointments = this.appointmentRepo.findByDate(date);
    const maxPerDay = this.config.getSettings().maxAppointmentsPerDay;
    if (dailyAppointments.length >= maxPerDay) {
      console.log(`[HOSPITAL] Max appointments reached for ${date}`);
      return null;
    }

    const appointment: Appointment = {
      id: randomUUID(),
      patientId,
      doctorId,
      date,
      reason,
      status: "scheduled",
    };
    this.appointmentRepo.save(appointment);
    console.log(`[HOSPITAL] Appointment scheduled: ${appointment.id}`);
    return appointment;
  }

  confirmAppointment(appointmentId: string): Appointment | undefined {
    const updated = this.appointmentRepo.update(appointmentId, {
      status: "confirmed",
    });
    if (!updated) return undefined;

    // Notify via Observer
    const event: ClinicalEvent = {
      type: "appointment:confirmed",
      patientId: updated.patientId,
      doctorId: updated.doctorId,
      message: `Your appointment on ${updated.date} has been confirmed.`,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(event);
    return updated;
  }

  cancelAppointment(appointmentId: string): Appointment | undefined {
    const updated = this.appointmentRepo.update(appointmentId, {
      status: "cancelled",
    });
    if (!updated) return undefined;

    const event: ClinicalEvent = {
      type: "appointment:cancelled",
      patientId: updated.patientId,
      doctorId: updated.doctorId,
      message: `Your appointment on ${updated.date} has been cancelled.`,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(event);
    return updated;
  }

  // --- Clinical Records ---

  addClinicalRecord(data: {
    patientId: string;
    doctorId: string;
    diagnosis: string;
    treatment: string;
    notes: string;
  }): ClinicalRecord {
    const record: ClinicalRecord = {
      id: randomUUID(),
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: new Date().toISOString().split("T")[0]!,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes,
    };
    this.clinicalRepo.save(record);

    // Emit clinical update event
    this.eventEmitter.emit({
      type: "clinical:update",
      patientId: data.patientId,
      doctorId: data.doctorId,
      message: `Clinical record updated: ${data.diagnosis}`,
      timestamp: new Date(),
    });

    console.log(`[HOSPITAL] Clinical record added: ${record.id}`);
    return record;
  }

  getPatientHistory(patientId: string): ClinicalRecord[] {
    return this.clinicalRepo.findByPatientId(patientId);
  }

  // --- Billing ---

  generateInvoice(
    patientId: string,
    appointmentId: string,
    baseAmount: number,
  ): Invoice | null {
    const patient = this.patientRepo.findById(patientId);
    if (!patient) {
      console.log(`[HOSPITAL] Patient ${patientId} not found for billing`);
      return null;
    }

    // Select billing strategy based on patient type
    const strategyMap = {
      private: new PrivateBilling(),
      insurance: new InsuranceBilling(),
      agreement: new AgreementBilling(),
    } as const;

    const billingContext = new BillingContext(strategyMap[patient.billingType]);
    const result = billingContext.calculateBill(baseAmount);

    const invoice: Invoice = {
      id: randomUUID(),
      patientId,
      appointmentId,
      date: new Date().toISOString().split("T")[0]!,
      baseAmount: result.baseAmount,
      discount: result.discount,
      totalAmount: result.totalAmount,
      billingMethod: result.method,
    };
    this.invoiceRepo.save(invoice);
    console.log(
      `[HOSPITAL] Invoice generated: $${invoice.totalAmount.toFixed(2)} (${invoice.billingMethod})`,
    );
    return invoice;
  }

  // --- Insurance Integration ---

  verifyInsurance(patientId: string, policyNumber: string): string {
    const coverage = this.insuranceAdapter.verifyCoverage(
      patientId,
      policyNumber,
    );
    if (coverage.isActive) {
      return `Coverage active: ${coverage.coveragePercentage}% — Auth: ${coverage.authorizationCode}`;
    }
    return "Coverage inactive or not found.";
  }

  submitInsuranceClaim(authorizationCode: string, amount: number): string {
    const result = this.insuranceAdapter.submitClaim(authorizationCode, amount);
    if (result.success) {
      return `Claim submitted successfully. Reference: ${result.referenceNumber}`;
    }
    return "Claim submission failed.";
  }

  // --- Patient Invoices ---

  getPatientInvoices(patientId: string): Invoice[] {
    return this.invoiceRepo.findByPatientId(patientId);
  }
}
