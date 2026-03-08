// Factory Method: centralizes creation of Person subtypes
// New roles (e.g. nurse, external specialist) can be added without modifying client code

import { randomUUID } from "node:crypto";
import type { Person } from "../models/Person";
import type { Patient, BillingType } from "../models/Patient";
import type { Doctor } from "../models/Doctor";
import type { AdminStaff } from "../models/AdminStaff";

interface CreatePatientInput {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  billingType: BillingType;
  insuranceId?: string;
}

interface CreateDoctorInput {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  licenseNumber: string;
}

interface CreateAdminInput {
  name: string;
  email: string;
  phone: string;
  department: string;
}

type PersonInput =
  | { role: "patient"; data: CreatePatientInput }
  | { role: "doctor"; data: CreateDoctorInput }
  | { role: "admin"; data: CreateAdminInput };

export class PersonFactory {
  // Creates a strongly-typed person based on role
  static create(input: PersonInput): Person {
    const id = randomUUID();

    switch (input.role) {
      case "patient": {
        const patient: Patient = {
          id,
          role: "patient",
          name: input.data.name,
          email: input.data.email,
          phone: input.data.phone,
          dateOfBirth: input.data.dateOfBirth,
          billingType: input.data.billingType,
          insuranceId: input.data.insuranceId,
        };
        return patient;
      }
      case "doctor": {
        const doctor: Doctor = {
          id,
          role: "doctor",
          name: input.data.name,
          email: input.data.email,
          phone: input.data.phone,
          specialty: input.data.specialty,
          licenseNumber: input.data.licenseNumber,
        };
        return doctor;
      }
      case "admin": {
        const admin: AdminStaff = {
          id,
          role: "admin",
          name: input.data.name,
          email: input.data.email,
          phone: input.data.phone,
          department: input.data.department,
        };
        return admin;
      }
    }
  }
}
