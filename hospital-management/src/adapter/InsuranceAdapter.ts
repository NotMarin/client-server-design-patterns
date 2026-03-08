// Adapter pattern: normalizes the external insurance API into a uniform interface
// The hospital system consumes InsurancePort without coupling to third-party formats

import { ExternalInsuranceAPI } from "./ExternalInsuranceAPI";

// Standardized interface the hospital system expects
export interface InsurancePort {
  verifyCoverage(patientId: string, policyNumber: string): CoverageResult;
  submitClaim(authorizationCode: string, amount: number): ClaimResult;
}

export interface CoverageResult {
  readonly isActive: boolean;
  readonly coveragePercentage: number;
  readonly authorizationCode: string;
  readonly message: string;
}

export interface ClaimResult {
  readonly success: boolean;
  readonly referenceNumber: string;
}

// Wraps ExternalInsuranceAPI and translates its proprietary response format
export class InsuranceAdapter implements InsurancePort {
  private readonly externalApi: ExternalInsuranceAPI;

  constructor(externalApi: ExternalInsuranceAPI) {
    this.externalApi = externalApi;
  }

  verifyCoverage(patientId: string, policyNumber: string): CoverageResult {
    const response = this.externalApi.verificarCobertura(
      patientId,
      policyNumber,
    );
    return {
      isActive: response.cod === 200,
      coveragePercentage: response.cov,
      authorizationCode: response.auth,
      message: response.msg,
    };
  }

  submitClaim(authorizationCode: string, amount: number): ClaimResult {
    const response = this.externalApi.enviarReclamacion(
      authorizationCode,
      amount,
    );
    return {
      success: response.ok,
      referenceNumber: response.ref,
    };
  }
}
