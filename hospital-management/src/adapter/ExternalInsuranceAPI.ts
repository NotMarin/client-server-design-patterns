// Simulates an external insurance company API with a non-standard interface
// This class is NOT modifiable — it represents a third-party system

export interface ExternalInsuranceResponse {
  cod: number;
  cov: number; // coverage percentage
  auth: string; // authorization code
  msg: string;
}

export class ExternalInsuranceAPI {
  // Returns data in the insurer's proprietary format
  verificarCobertura(
    cedula: string,
    poliza: string,
  ): ExternalInsuranceResponse {
    console.log(
      `[EXTERNAL API] Verifying coverage for ID ${cedula}, policy ${poliza}`,
    );
    return {
      cod: 200,
      cov: 80,
      auth: `AUTH-${Date.now()}`,
      msg: "Cobertura activa",
    };
  }

  enviarReclamacion(
    authCode: string,
    monto: number,
  ): { ok: boolean; ref: string } {
    console.log(
      `[EXTERNAL API] Submitting claim: auth=${authCode}, amount=${monto}`,
    );
    return {
      ok: true,
      ref: `REF-${Date.now()}`,
    };
  }
}
