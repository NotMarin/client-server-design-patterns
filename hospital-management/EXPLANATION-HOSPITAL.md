# Sistema de Gestión Hospitalaria

Sistema de gestión hospitalaria implementado en **TypeScript** que integra siete patrones de diseño (Factory Method, Singleton, Observer, Strategy, Adapter, Repository y Facade) en una arquitectura por capas. El sistema modela el flujo operativo completo de un hospital: registro de personas, agendamiento de citas, historial clínico, facturación diferenciada y comunicación con aseguradoras externas.

---

## Tabla de Contenidos

1. [Enunciado resuelto](#1-enunciado-resuelto)
2. [Patrones de diseño aplicados](#2-patrones-de-diseño-aplicados)
3. [Arquitectura y flujo de ejecución](#3-arquitectura-y-flujo-de-ejecución)
4. [Descripción de cada función y clase](#4-descripción-de-cada-función-y-clase)
5. [Puntos críticos del diseño](#5-puntos-críticos-del-diseño)
6. [Dependencias y configuración](#6-dependencias-y-configuración)
7. [Ejemplo de uso](#7-ejemplo-de-uso)

---

## 1. Enunciado resuelto

### Problema

Diseñar e implementar un **sistema de gestión hospitalaria** en TypeScript que resuelva los siguientes requisitos:

1. **Creación polimórfica de personas**: El sistema maneja tres tipos de personas (paciente, doctor, personal administrativo) con campos específicos por rol. Se necesita un mecanismo centralizado de creación que garantice tipado fuerte, generación automática de IDs y extensibilidad ante nuevos roles sin modificar el código cliente.

2. **Configuración global única**: Parámetros operativos del hospital (nombre, horarios, teléfono de emergencias, límite diario de citas) deben ser accesibles y modificables desde cualquier módulo, manteniendo una única fuente de verdad durante toda la ejecución.

3. **Notificaciones desacopladas por eventos clínicos**: Eventos como la confirmación o cancelación de citas, actualizaciones clínicas y alertas de emergencia deben disparar notificaciones por múltiples canales (email, SMS, push) sin que la lógica de negocio dependa de implementaciones concretas de mensajería. Distintos eventos deben rutear a distintos subconjuntos de canales.

4. **Facturación diferenciada por tipo de paciente**: El cálculo del monto final de una factura depende del tipo de facturación del paciente: pago privado (sin descuento), aseguradora (cobertura porcentual) o convenio institucional (descuento fijo). El algoritmo de facturación debe poder intercambiarse sin alterar la lógica de dominio.

5. **Integración con sistemas externos de aseguradoras**: Una API externa con interfaz propietaria (nombres en español, campos crípticos como `cod`, `cov`, `auth`) debe integrarse al sistema sin contaminar el dominio con formatos ajenos.

6. **Persistencia abstracta con operaciones CRUD**: Los datos de pacientes, citas, registros clínicos y facturas necesitan operaciones CRUD uniformes. La implementación actual es en memoria, pero debe permitir sustituirse por una base de datos sin afectar la lógica de negocio.

7. **Interfaz unificada de alto nivel**: La complejidad de fábricas, repositorios, eventos, estrategias y adaptadores debe ocultarse detrás de una API simplificada que el código cliente pueda consumir sin conocer los subsistemas internos.

### Solución

Se implementó una arquitectura por capas que integra siete patrones de diseño GoF:

| Requisito | Patrón aplicado |
|---|---|
| Creación polimórfica de personas | **Factory Method** |
| Configuración global única | **Singleton** |
| Notificaciones desacopladas | **Observer** |
| Facturación diferenciada | **Strategy** |
| Integración con API externa | **Adapter** |
| Persistencia abstracta CRUD | **Repository** |
| Interfaz unificada | **Facade** |

El punto de integración central es la clase `HospitalFacade`, que orquesta todos los patrones y es la única API consumida por el punto de entrada (`index.ts`).

---

## 2. Patrones de diseño aplicados

### 2.1 Factory Method (Creacional)

| Aspecto | Detalle |
|---|---|
| **Clase** | `PersonFactory` |
| **Archivo** | `src/factory/PersonFactory.ts` |
| **Productos** | `Patient`, `Doctor`, `AdminStaff` |

**Implementación**: `PersonFactory` expone un único método estático `create(input: PersonInput): Person`. El parámetro `input` es una unión discriminada (discriminated union) donde el campo `role` ("patient" | "doctor" | "admin") determina qué subtipo se construye. Internamente:

1. Genera un UUID vía `randomUUID()` de `node:crypto`.
2. Ejecuta un `switch` sobre `input.role`.
3. Construye un object literal tipado (`Patient`, `Doctor` o `AdminStaff`) con todos los campos correspondientes.
4. Retorna el objeto como `Person`.

**Tipo discriminado** (no exportado):
```typescript
type PersonInput =
  | { role: "patient"; data: CreatePatientInput }
  | { role: "doctor";  data: CreateDoctorInput }
  | { role: "admin";   data: CreateAdminInput };
```

**Justificación**: Sin la fábrica, cada sitio que necesite crear una persona tendría que: importar `randomUUID`, conocer los campos específicos de cada subtipo y construir manualmente object literals con el `role` correcto. La fábrica centraliza esta lógica, garantiza la generación consistente de IDs y permite agregar nuevos roles (ej. "nurse", "specialist") añadiendo un caso al switch sin modificar el código cliente. La unión discriminada asegura en tiempo de compilación que `data` contenga exactamente los campos requeridos por cada `role`.

---

### 2.2 Singleton (Creacional)

| Aspecto | Detalle |
|---|---|
| **Clase** | `HospitalConfig` |
| **Archivo** | `src/config/HospitalConfig.ts` |

**Implementación**:
- Constructor `private` que inicializa `settings` con valores por defecto.
- Campo estático `private static instance: HospitalConfig | null = null`.
- Método `static getInstance()`: crea la instancia si no existe; siempre retorna la misma.
- `getSettings()`: retorna una copia superficial (`{ ...this.settings }`) tipada como `Readonly<HospitalSettings>` para prevenir mutación externa.
- `updateSettings(partial)`: merge parcial vía spread operator.
- `static resetInstance()`: reinicia el singleton (utilidad para testing).

**Valores por defecto**:
```typescript
{
  hospitalName: "Hospital Central UTP",
  operatingHours: { open: "07:00", close: "19:00" },
  emergencyPhone: "911",
  maxAppointmentsPerDay: 50,
}
```

**Justificación**: La configuración del hospital es un recurso inherentemente único: no tiene sentido que coexistan dos instancias con valores distintos de `maxAppointmentsPerDay` o `hospitalName`. El Singleton garantiza que tanto el `HospitalFacade` (que lee `maxAppointmentsPerDay` al agendar citas) como el `index.ts` (que actualiza `hospitalName`) operen sobre la misma fuente de verdad. `getSettings()` retorna una copia para impedir que código externo mute el estado interno directamente, preservando la encapsulación.

---

### 2.3 Observer (Comportamental)

| Aspecto | Detalle |
|---|---|
| **Interfaz observador** | `ClinicalObserver` |
| **Sujeto (emisor)** | `ClinicalEventEmitter` |
| **Archivo sujeto** | `src/observer/ClinicalEventEmitter.ts` |
| **Implementaciones** | `EmailNotifier`, `SmsNotifier`, `PushNotifier` |
| **Archivo implementaciones** | `src/observer/NotificationChannels.ts` |

**Interfaz del evento**:
```typescript
type ClinicalEventType =
  | "appointment:confirmed"
  | "appointment:cancelled"
  | "medication:reminder"
  | "clinical:update"
  | "emergency:alert";

interface ClinicalEvent {
  readonly type: ClinicalEventType;
  readonly patientId: string;
  readonly doctorId?: string;
  readonly message: string;
  readonly timestamp: Date;
}
```

**Interfaz del observador**:
```typescript
interface ClinicalObserver {
  readonly channelName: string;
  update(event: ClinicalEvent): void;
}
```

**Suscripciones configuradas en `HospitalFacade`**:

| Tipo de evento | Email | SMS | Push |
|---|---|---|---|
| `appointment:confirmed` | Si | Si | - |
| `appointment:cancelled` | Si | - | - |
| `clinical:update` | Si | - | - |
| `medication:reminder` | - | Si | - |
| `emergency:alert` | Si | Si | - |

**Diferencia clave con Observer clásico**: Este sistema implementa un Observer **por tipo de evento** (event-driven). El `Map<ClinicalEventType, ClinicalObserver[]>` permite que cada observador se suscriba solo a los eventos que le interesan, en lugar de recibir todos los eventos y filtrar internamente. Cuando `emit(event)` es invocado, solo se notifican los observadores suscritos al `event.type` específico.

**Justificación**: Las notificaciones son una preocupación transversal que no debe contaminar la lógica de citas o registros clínicos. El `HospitalFacade` solo invoca `eventEmitter.emit(event)` después de cada operación relevante; desconoce cuántos o cuáles canales recibirán la notificación. Agregar un nuevo canal (ej. WhatsApp, webhook) solo requiere implementar `ClinicalObserver` y suscribirse: cero cambios en la Facade ni en los repositorios.

---

### 2.4 Strategy (Comportamental)

| Aspecto | Detalle |
|---|---|
| **Interfaz** | `BillingStrategy` |
| **Implementaciones** | `PrivateBilling`, `InsuranceBilling`, `AgreementBilling` |
| **Contexto** | `BillingContext` |
| **Archivo** | `src/strategy/BillingStrategy.ts` |

**Interfaz**:
```typescript
interface BillingStrategy {
  readonly name: string;
  calculate(baseAmount: number): BillingResult;
}

interface BillingResult {
  readonly baseAmount: number;
  readonly discount: number;
  readonly totalAmount: number;
  readonly method: string;
}
```

**Algoritmos de cada estrategia**:

| Estrategia | Descuento | Fórmula | Ejemplo (base=$500,000) |
|---|---|---|---|
| `PrivateBilling` | 0% | `total = base` | total = $500,000 |
| `InsuranceBilling` | Configurable (default 80%) | `discount = base * (coverage/100)` ; `total = base - discount` | discount = $400,000 ; total = $100,000 |
| `AgreementBilling` | Configurable (default 50%) | `discount = base * (discountPct/100)` ; `total = base - discount` | discount = $250,000 ; total = $250,000 |

**Contexto (`BillingContext`)**: Almacena una referencia mutable a un `BillingStrategy`. El método `calculateBill(baseAmount)` delega a `this.strategy.calculate(baseAmount)`. El método `setStrategy()` permite intercambiar la estrategia en runtime.

**Uso en la Facade**: `generateInvoice()` crea un mapa `{ private: PrivateBilling, insurance: InsuranceBilling, agreement: AgreementBilling }` y selecciona la estrategia según `patient.billingType`. Luego instancia un `BillingContext` con dicha estrategia y calcula.

**Justificación**: La facturación varía radicalmente entre tipos de paciente. Sin Strategy, `generateInvoice()` necesitaría un `if/else` o `switch` interno con la lógica de cada cálculo, violando SRP y OCP. Cada estrategia encapsula su propio algoritmo: `InsuranceBilling` conoce el porcentaje de cobertura, `AgreementBilling` conoce el descuento institucional, y `PrivateBilling` simplemente retorna el monto completo. Agregar una nueva modalidad (ej. "subsidio estatal") es crear una nueva clase sin modificar las existentes.

---

### 2.5 Adapter (Estructural)

| Aspecto | Detalle |
|---|---|
| **Interfaz destino (target)** | `InsurancePort` |
| **Adaptador** | `InsuranceAdapter` |
| **Adaptado (adaptee)** | `ExternalInsuranceAPI` |
| **Archivos** | `src/adapter/InsuranceAdapter.ts`, `src/adapter/ExternalInsuranceAPI.ts` |

**API externa (no modificable)**:
```typescript
class ExternalInsuranceAPI {
  verificarCobertura(cedula: string, poliza: string): ExternalInsuranceResponse;
  enviarReclamacion(authCode: string, monto: number): { ok: boolean; ref: string };
}

interface ExternalInsuranceResponse {
  cod: number;   // código de estado
  cov: number;   // porcentaje de cobertura
  auth: string;  // código de autorización
  msg: string;   // mensaje
}
```

**Interfaz destino (lo que el hospital espera)**:
```typescript
interface InsurancePort {
  verifyCoverage(patientId: string, policyNumber: string): CoverageResult;
  submitClaim(authorizationCode: string, amount: number): ClaimResult;
}

interface CoverageResult {
  readonly isActive: boolean;
  readonly coveragePercentage: number;
  readonly authorizationCode: string;
  readonly message: string;
}

interface ClaimResult {
  readonly success: boolean;
  readonly referenceNumber: string;
}
```

**Traducción que realiza el adaptador**:

| Campo externo | Campo normalizado | Transformación |
|---|---|---|
| `response.cod` | `isActive` | `cod === 200` |
| `response.cov` | `coveragePercentage` | Asignación directa |
| `response.auth` | `authorizationCode` | Asignación directa |
| `response.msg` | `message` | Asignación directa |
| `response.ok` | `success` | Asignación directa |
| `response.ref` | `referenceNumber` | Asignación directa |

**Justificación**: La API externa usa convenciones propietarias (nombres en español, campos abreviados como `cod`, `cov`, `ref`). Si el dominio del hospital consumiera esta interfaz directamente, cualquier cambio en la API externa propagaría modificaciones por todo el sistema. El adaptador crea una frontera: el dominio solo conoce `InsurancePort` con nombres claros en inglés y tipos semánticos (`isActive: boolean` vs `cod: number`). Si la aseguradora cambia su API, solo se modifica `InsuranceAdapter`.

---

### 2.6 Repository (Estructural / Acceso a datos)

| Aspecto | Detalle |
|---|---|
| **Interfaz genérica** | `Repository<T>` |
| **Implementación base** | `InMemoryRepository<T>` |
| **Repositorios especializados** | `PatientRepository`, `AppointmentRepository`, `ClinicalRecordRepository`, `InvoiceRepository` |
| **Archivos** | `src/repository/Repository.ts`, `src/repository/PatientRepository.ts`, `src/repository/AppointmentRepository.ts`, `src/repository/ClinicalRecordRepository.ts`, `src/repository/InvoiceRepository.ts` |

**Interfaz genérica**:
```typescript
interface Repository<T extends { id: string }> {
  findAll(): T[];
  findById(id: string): T | undefined;
  save(entity: T): void;
  update(id: string, partial: Partial<T>): T | undefined;
  delete(id: string): boolean;
}
```

**Implementación base** (`InMemoryRepository<T>`): Usa un `Map<string, T>` protegido. Cada método es una operación sobre el Map:
- `save` → `store.set(entity.id, entity)`
- `findById` → `store.get(id)`
- `findAll` → `Array.from(store.values())`
- `update` → merge superficial con spread + re-set (protege `id` de sobreescritura)
- `delete` → `store.delete(id)`

**Repositorios especializados** (extienden `InMemoryRepository` con consultas de dominio):

| Repositorio | Métodos adicionales |
|---|---|
| `PatientRepository` | `findByBillingType(billingType): Patient[]`, `findByName(name): Patient[]` (búsqueda case-insensitive por substring) |
| `AppointmentRepository` | `findByPatientId(patientId)`, `findByDoctorId(doctorId)`, `findByDate(date)` |
| `ClinicalRecordRepository` | `findByPatientId(patientId)`, `findByDoctorId(doctorId)` |
| `InvoiceRepository` | `findByPatientId(patientId)` |

**Justificación**: El patrón Repository abstrae el mecanismo de persistencia detrás de una interfaz CRUD genérica. Hoy los datos viven en un `Map` en memoria; mañana podrían vivir en PostgreSQL o MongoDB. Solo habría que crear nuevas implementaciones de `Repository<T>` sin modificar `HospitalFacade` ni los modelos. La restricción genérica `T extends { id: string }` garantiza que toda entidad persistible tiene un identificador string, permitiendo operaciones de lookup uniformes.

---

### 2.7 Facade (Estructural)

| Aspecto | Detalle |
|---|---|
| **Clase** | `HospitalFacade` |
| **Archivo** | `src/facade/HospitalFacade.ts` |

**Subsistemas orquestados**:
- `HospitalConfig` (Singleton)
- `PersonFactory` (Factory)
- `ClinicalEventEmitter` + notificadores (Observer)
- `BillingContext` + estrategias (Strategy)
- `InsuranceAdapter` (Adapter)
- 4 repositorios (Repository)

**API pública** (15 métodos):

| Categoría | Métodos |
|---|---|
| Configuración | `getHospitalInfo()` |
| Pacientes | `registerPatient(data)`, `getPatient(id)`, `getAllPatients()` |
| Doctores | `registerDoctor(data)` |
| Citas | `scheduleAppointment(...)`, `confirmAppointment(id)`, `cancelAppointment(id)` |
| Historial clínico | `addClinicalRecord(data)`, `getPatientHistory(patientId)` |
| Facturación | `generateInvoice(patientId, appointmentId, baseAmount)`, `getPatientInvoices(patientId)` |
| Seguros | `verifyInsurance(patientId, policyNumber)`, `submitInsuranceClaim(authCode, amount)` |

**Justificación**: Sin la Facade, el código cliente (`index.ts`) tendría que instanciar manualmente la fábrica, los repositorios, el emisor de eventos, el adaptador y las estrategias, coordinando sus interacciones. La Facade reduce esta complejidad a una sola clase con métodos de alto nivel. El `index.ts` no importa ni un solo repositorio, estrategia u observador; solo conoce `HospitalFacade` y `HospitalConfig`.

---

## 3. Arquitectura y flujo de ejecución

### 3.1 Estructura del proyecto

```
hospital-management/
├── package.json                        # Manifiesto NPM, scripts, dependencias
├── tsconfig.json                       # Configuración del compilador TypeScript
├── class-diagram.mmd                  # Diagrama UML de clases (Mermaid)
├── dist/                              # Salida compilada (JavaScript)
└── src/
    ├── index.ts                       # Punto de entrada y demostración
    ├── config/
    │   └── HospitalConfig.ts          # Singleton de configuración
    ├── factory/
    │   └── PersonFactory.ts           # Factory Method para Person/Patient/Doctor/Admin
    ├── models/
    │   ├── Person.ts                  # Interfaz base + tipo PersonRole
    │   ├── Patient.ts                 # Interfaz Patient + tipo BillingType
    │   ├── Doctor.ts                  # Interfaz Doctor
    │   ├── AdminStaff.ts             # Interfaz AdminStaff
    │   ├── Appointment.ts            # Interfaz Appointment + tipo AppointmentStatus
    │   ├── ClinicalRecord.ts         # Interfaz ClinicalRecord
    │   └── Invoice.ts                # Interfaz Invoice
    ├── observer/
    │   ├── ClinicalEventEmitter.ts   # Sujeto Observer + tipos de evento
    │   └── NotificationChannels.ts   # EmailNotifier, SmsNotifier, PushNotifier
    ├── strategy/
    │   └── BillingStrategy.ts        # BillingStrategy + 3 implementaciones + BillingContext
    ├── adapter/
    │   ├── ExternalInsuranceAPI.ts   # API externa simulada (no modificable)
    │   └── InsuranceAdapter.ts       # Adaptador + InsurancePort + tipos resultado
    └── repository/
        ├── Repository.ts             # Interfaz genérica + InMemoryRepository<T>
        ├── PatientRepository.ts      # Repositorio especializado de pacientes
        ├── AppointmentRepository.ts  # Repositorio especializado de citas
        ├── ClinicalRecordRepository.ts # Repositorio de registros clínicos
        └── InvoiceRepository.ts      # Repositorio de facturas
```

### 3.2 Diagrama de flujo de ejecución

```
┌──────────────────────────────────────────────────────────────────────┐
│                      index.ts (Punto de entrada)                      │
│                         function main(): void                         │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 1: SINGLETON — Configuración del hospital                       │
│                                                                       │
│  new HospitalFacade()                                                │
│    ├── HospitalConfig.getInstance()                                  │
│    │     └── constructor privado → settings por defecto              │
│    │         hospitalName: "Hospital Central UTP"                     │
│    │         operatingHours: 07:00-19:00                             │
│    │         emergencyPhone: "911"                                    │
│    │         maxAppointmentsPerDay: 50                               │
│    │                                                                  │
│    ├── Crea ClinicalEventEmitter                                     │
│    │     ├── subscribe("appointment:confirmed", EmailNotifier)       │
│    │     ├── subscribe("appointment:confirmed", SmsNotifier)         │
│    │     ├── subscribe("appointment:cancelled", EmailNotifier)       │
│    │     ├── subscribe("clinical:update", EmailNotifier)             │
│    │     ├── subscribe("medication:reminder", SmsNotifier)           │
│    │     ├── subscribe("emergency:alert", EmailNotifier)             │
│    │     └── subscribe("emergency:alert", SmsNotifier)               │
│    │                                                                  │
│    ├── InsuranceAdapter(new ExternalInsuranceAPI())                   │
│    │                                                                  │
│    └── Crea 4 repositorios vacíos (Patient, Appointment,            │
│         ClinicalRecord, Invoice)                                     │
│                                                                       │
│  hospital.getHospitalInfo()                                          │
│    → "Hospital Central UTP | Hours: 07:00-19:00 | Emergency: 911"   │
│                                                                       │
│  HospitalConfig.getInstance().updateSettings(                        │
│    { hospitalName: "Hospital Universitario UTP" })                   │
│  hospital.getHospitalInfo()                                          │
│    → "Hospital Universitario UTP | Hours: 07:00-19:00 | ..."        │
│                                                                       │
│  (Demuestra que el Singleton propaga cambios globalmente)            │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 2: FACTORY — Registro de 3 pacientes                           │
│                                                                       │
│  hospital.registerPatient({                                          │
│    name: "Carlos Mendez", billingType: "insurance",                  │
│    insuranceId: "POL-12345", ...                                     │
│  })                                                                   │
│    ├── PersonFactory.create({ role: "patient", data })               │
│    │     ├── randomUUID() → genera ID único                         │
│    │     └── switch("patient") → object literal Patient              │
│    ├── patientRepo.save(patient)                                     │
│    └── console: [HOSPITAL] Patient registered: Carlos Mendez (uuid) │
│                                                                       │
│  hospital.registerPatient({ name: "Ana Torres",                      │
│    billingType: "private", ... })                                    │
│                                                                       │
│  hospital.registerPatient({ name: "Luis Ramirez",                    │
│    billingType: "agreement", ... })                                  │
│                                                                       │
│  getAllPatients().length → 3                                         │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 3: FACTORY — Registro de 1 doctor                              │
│                                                                       │
│  hospital.registerDoctor({                                           │
│    name: "Dra. Maria Lopez", specialty: "Cardiology",                │
│    licenseNumber: "MED-56789", ...                                   │
│  })                                                                   │
│    ├── PersonFactory.create({ role: "doctor", data })                │
│    │     └── switch("doctor") → object literal Doctor                │
│    └── ¡NO se persiste en ningún repositorio!                        │
│         El doctor solo vive en la variable local                     │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 4: OBSERVER — Citas y notificaciones                           │
│                                                                       │
│  appt1 = hospital.scheduleAppointment(                               │
│    patient1.id, doctor.id, "2026-03-10", "Routine cardiac checkup")  │
│    ├── patientRepo.findById(patient1.id) → existe                   │
│    ├── appointmentRepo.findByDate("2026-03-10").length < 50 → OK    │
│    ├── Crea Appointment { id: uuid, status: "scheduled" }            │
│    └── appointmentRepo.save(appointment)                             │
│                                                                       │
│  appt2 = hospital.scheduleAppointment(                               │
│    patient2.id, doctor.id, "2026-03-10", "Chest pain evaluation")    │
│                                                                       │
│  hospital.confirmAppointment(appt1.id)                               │
│    ├── appointmentRepo.update(id, { status: "confirmed" })           │
│    ├── Construye ClinicalEvent { type: "appointment:confirmed" }     │
│    └── eventEmitter.emit(event)                                      │
│         ├── [EMAIL] To patient <id>: ...confirmed (appointment:...)  │
│         └── [SMS]   To patient <id>: ...confirmed (appointment:...)  │
│                                                                       │
│  hospital.cancelAppointment(appt2.id)                                │
│    ├── appointmentRepo.update(id, { status: "cancelled" })           │
│    ├── Construye ClinicalEvent { type: "appointment:cancelled" }     │
│    └── eventEmitter.emit(event)                                      │
│         └── [EMAIL] To patient <id>: ...cancelled (appointment:...)  │
│              (SMS no suscrito a "appointment:cancelled")              │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 5: REPOSITORY + OBSERVER — Registros clínicos                  │
│                                                                       │
│  hospital.addClinicalRecord({                                        │
│    patientId: patient1.id, doctorId: doctor.id,                      │
│    diagnosis: "Mild hypertension",                                   │
│    treatment: "Losartan 50mg daily",                                 │
│    notes: "Follow-up in 3 months. Monitor blood pressure."           │
│  })                                                                   │
│    ├── Crea ClinicalRecord { id: uuid, date: "2026-03-09" }         │
│    ├── clinicalRepo.save(record)                                     │
│    ├── eventEmitter.emit({ type: "clinical:update", ... })           │
│    │     └── [EMAIL] To patient <id>: Clinical record updated: ...   │
│    └── console: [HOSPITAL] Clinical record added: <uuid>             │
│                                                                       │
│  hospital.getPatientHistory(patient1.id) → [1 record]               │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 6: STRATEGY — Facturación diferenciada                         │
│                                                                       │
│  hospital.generateInvoice(patient1.id, appt1.id, 500_000)           │
│    ├── patientRepo.findById(patient1.id) → billingType: "insurance"  │
│    ├── strategyMap = { private: PrivateBilling,                      │
│    │     insurance: InsuranceBilling(80), agreement: AgreementBilling }│
│    ├── BillingContext(InsuranceBilling)                               │
│    ├── billingContext.calculateBill(500_000)                          │
│    │     └── InsuranceBilling.calculate(500_000)                     │
│    │           discount = 500000 * 0.80 = 400,000                    │
│    │           total   = 500000 - 400000 = 100,000                   │
│    ├── Crea Invoice { baseAmount: 500000, discount: 400000,          │
│    │     totalAmount: 100000, billingMethod: "Insurance - 80% cov." }│
│    └── invoiceRepo.save(invoice)                                     │
│                                                                       │
│  hospital.generateInvoice(patient2.id, appt2.id, 500_000)           │
│    └── PrivateBilling.calculate(500_000)                             │
│          discount = 0, total = 500,000                               │
│                                                                       │
│  appt3 = scheduleAppointment(patient3, doctor, "2026-03-11", ...)    │
│  hospital.generateInvoice(patient3.id, appt3.id, 500_000)           │
│    └── AgreementBilling.calculate(500_000)                           │
│          discount = 250,000, total = 250,000                         │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 7: ADAPTER — Integración con aseguradora externa               │
│                                                                       │
│  hospital.verifyInsurance(patient1.id, "POL-12345")                  │
│    ├── InsuranceAdapter.verifyCoverage(id, "POL-12345")              │
│    │     ├── ExternalInsuranceAPI.verificarCobertura(id, "POL-12345")│
│    │     │     └── { cod: 200, cov: 80, auth: "AUTH-...", msg: ... }│
│    │     └── Traduce → { isActive: true, coveragePercentage: 80,    │
│    │           authorizationCode: "AUTH-...", message: "..." }       │
│    └── "Coverage active: 80% — Auth: AUTH-..."                      │
│                                                                       │
│  hospital.submitInsuranceClaim("AUTH-001", 100_000)                  │
│    ├── InsuranceAdapter.submitClaim("AUTH-001", 100_000)             │
│    │     ├── ExternalInsuranceAPI.enviarReclamacion("AUTH-001", ...) │
│    │     │     └── { ok: true, ref: "REF-..." }                     │
│    │     └── Traduce → { success: true, referenceNumber: "REF-..." }│
│    └── "Claim submitted successfully. Reference: REF-..."           │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PASO 8: REPOSITORY — Resumen de facturas por paciente               │
│                                                                       │
│  Para cada paciente en getAllPatients():                              │
│    invoices = invoiceRepo.findByPatientId(patient.id)                │
│    total = invoices.reduce(Σ totalAmount)                            │
│                                                                       │
│  Carlos Mendez:  1 invoice(s), Total: $100000                       │
│  Ana Torres:     1 invoice(s), Total: $500000                       │
│  Luis Ramirez:   1 invoice(s), Total: $250000                       │
│                                                                       │
│  ═══════════════════ DEMO COMPLETE ═══════════════════               │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Diagrama de interacción entre patrones

```
  index.ts
    │
    │  (única dependencia)
    ▼
┌──────────────────────────────────────────────────────────────────┐
│                       HospitalFacade                              │
│                        [FACADE]                                   │
│                                                                   │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐    │
│  │ HospitalCfg│  │ PersonFactory│  │ ClinicalEventEmitter  │    │
│  │ [SINGLETON]│  │ [FACTORY]    │  │ [OBSERVER subject]    │    │
│  └────────────┘  └──────────────┘  │                       │    │
│                                     │  ┌─────────────────┐ │    │
│  ┌────────────────────────────┐    │  │ EmailNotifier   │ │    │
│  │ BillingContext              │    │  │ SmsNotifier     │ │    │
│  │ [STRATEGY context]         │    │  │ (PushNotifier)  │ │    │
│  │  ├── PrivateBilling        │    │  └─────────────────┘ │    │
│  │  ├── InsuranceBilling      │    └───────────────────────┘    │
│  │  └── AgreementBilling      │                                  │
│  └────────────────────────────┘    ┌───────────────────────┐    │
│                                     │ InsuranceAdapter      │    │
│  ┌────────────────────────────┐    │ [ADAPTER]             │    │
│  │ Repositorios [REPOSITORY]  │    │  └── ExternalInsAPI   │    │
│  │  ├── PatientRepository     │    └───────────────────────┘    │
│  │  ├── AppointmentRepository │                                  │
│  │  ├── ClinicalRecordRepo    │                                  │
│  │  └── InvoiceRepository     │                                  │
│  └────────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Descripción de cada función y clase

### 4.1 Tipos y enumeraciones

#### `type PersonRole` (`src/models/Person.ts`)
```typescript
type PersonRole = "patient" | "doctor" | "admin";
```
Unión literal que discrimina los subtipos de `Person`.

#### `type BillingType` (`src/models/Patient.ts`)
```typescript
type BillingType = "private" | "insurance" | "agreement";
```
Determina qué `BillingStrategy` se aplica al generar facturas.

#### `type AppointmentStatus` (`src/models/Appointment.ts`)
```typescript
type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed";
```
Estados posibles de una cita médica.

#### `type ClinicalEventType` (`src/observer/ClinicalEventEmitter.ts`)
```typescript
type ClinicalEventType =
  | "appointment:confirmed"
  | "appointment:cancelled"
  | "medication:reminder"
  | "clinical:update"
  | "emergency:alert";
```
Tipos de eventos clínicos que disparan notificaciones.

---

### 4.2 Interfaces de modelo

#### `interface Person` (`src/models/Person.ts`)
```typescript
interface Person {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly role: PersonRole;
}
```
**Responsabilidad**: Contrato base para todas las personas del sistema. Todos los campos son `readonly`.

#### `interface Patient` (`src/models/Patient.ts`)
```typescript
interface Patient extends Person {
  readonly role: "patient";
  readonly dateOfBirth: string;
  readonly billingType: BillingType;
  readonly insuranceId?: string;
}
```
**Responsabilidad**: Extiende `Person` con datos médico-administrativos. `insuranceId` es opcional (solo aplica a pacientes con `billingType: "insurance"`).

#### `interface Doctor` (`src/models/Doctor.ts`)
```typescript
interface Doctor extends Person {
  readonly role: "doctor";
  readonly specialty: string;
  readonly licenseNumber: string;
}
```

#### `interface AdminStaff` (`src/models/AdminStaff.ts`)
```typescript
interface AdminStaff extends Person {
  readonly role: "admin";
  readonly department: string;
}
```

#### `interface Appointment` (`src/models/Appointment.ts`)
```typescript
interface Appointment {
  readonly id: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly date: string;
  readonly reason: string;
  status: AppointmentStatus;  // ← MUTABLE
}
```
**Nota crítica**: `status` es el **único campo mutable** en todo el sistema de modelos. Esto permite que `InMemoryRepository.update()` actualice el estado de la cita sin reconstruir el objeto completo.

#### `interface ClinicalRecord` (`src/models/ClinicalRecord.ts`)
```typescript
interface ClinicalRecord {
  readonly id: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly date: string;
  readonly diagnosis: string;
  readonly treatment: string;
  readonly notes: string;
}
```

#### `interface Invoice` (`src/models/Invoice.ts`)
```typescript
interface Invoice {
  readonly id: string;
  readonly patientId: string;
  readonly appointmentId: string;
  readonly date: string;
  readonly baseAmount: number;
  readonly discount: number;
  readonly totalAmount: number;
  readonly billingMethod: string;
}
```

---

### 4.3 `PersonFactory` (`src/factory/PersonFactory.ts`)

```typescript
class PersonFactory {
  static create(input: PersonInput): Person;
}
```

| Aspecto | Detalle |
|---|---|
| **Responsabilidad** | Crea instancias de `Patient`, `Doctor` o `AdminStaff` según `input.role` |
| **Entrada** | `PersonInput` (unión discriminada con `role` y `data`) |
| **Salida** | `Person` (tipado como la interfaz base; el llamador hace cast al subtipo) |
| **Efectos secundarios** | Ninguno. Operación pura de creación. |

**Tipos de entrada internos** (no exportados):

| Tipo | Campos |
|---|---|
| `CreatePatientInput` | `name`, `email`, `phone`, `dateOfBirth`, `billingType`, `insuranceId?` |
| `CreateDoctorInput` | `name`, `email`, `phone`, `specialty`, `licenseNumber` |
| `CreateAdminInput` | `name`, `email`, `phone`, `department` |

---

### 4.4 `HospitalConfig` (`src/config/HospitalConfig.ts`)

```typescript
class HospitalConfig {
  private static instance: HospitalConfig | null;
  private settings: HospitalSettings;

  private constructor();
  static getInstance(): HospitalConfig;
  getSettings(): Readonly<HospitalSettings>;
  updateSettings(partial: Partial<HospitalSettings>): void;
  static resetInstance(): void;
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `getInstance()` | Retorna la instancia única | Ninguna | `HospitalConfig` | Crea instancia si no existe |
| `getSettings()` | Lee la configuración actual | Ninguna | `Readonly<HospitalSettings>` (copia) | Ninguno |
| `updateSettings(partial)` | Actualiza parcialmente la config | `Partial<HospitalSettings>` | `void` | Muta `this.settings` via spread merge |
| `resetInstance()` | Destruye el singleton | Ninguna | `void` | Establece `instance = null` |

---

### 4.5 `ClinicalEventEmitter` (`src/observer/ClinicalEventEmitter.ts`)

```typescript
class ClinicalEventEmitter {
  private observers: Map<ClinicalEventType, ClinicalObserver[]>;

  subscribe(eventType: ClinicalEventType, observer: ClinicalObserver): void;
  unsubscribe(eventType: ClinicalEventType, observer: ClinicalObserver): void;
  emit(event: ClinicalEvent): void;
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `subscribe(eventType, observer)` | Registra observador para un tipo de evento | Tipo de evento + observador | `void` | Muta el Map interno |
| `unsubscribe(eventType, observer)` | Elimina observador por referencia | Tipo de evento + observador | `void` | Filtra el array en el Map |
| `emit(event)` | Notifica a todos los observadores del tipo dado | `ClinicalEvent` | `void` | Invoca `update()` en cada observador suscrito (I/O a consola) |

---

### 4.6 Notificadores (`src/observer/NotificationChannels.ts`)

#### `class EmailNotifier implements ClinicalObserver`
```typescript
readonly channelName = "email";
update(event: ClinicalEvent): void;
```
- **Salida a consola**: `[EMAIL] To patient ${event.patientId}: ${event.message} (${event.type})`

#### `class SmsNotifier implements ClinicalObserver`
```typescript
readonly channelName = "sms";
update(event: ClinicalEvent): void;
```
- **Salida a consola**: `[SMS] To patient ${event.patientId}: ${event.message} (${event.type})`

#### `class PushNotifier implements ClinicalObserver`
```typescript
readonly channelName = "push";
update(event: ClinicalEvent): void;
```
- **Salida a consola**: `[PUSH] To patient ${event.patientId}: ${event.message} (${event.type})`
- **Nota**: Definido pero no suscrito a ningún evento en la Facade. Existe para extensibilidad futura.

---

### 4.7 Estrategias de facturación (`src/strategy/BillingStrategy.ts`)

#### `class PrivateBilling implements BillingStrategy`
```typescript
readonly name = "private";
calculate(baseAmount: number): BillingResult;
```
- **Algoritmo**: Retorna el monto base sin descuento. `{ baseAmount, discount: 0, totalAmount: baseAmount, method: "Private - Full payment" }`.

#### `class InsuranceBilling implements BillingStrategy`
```typescript
readonly name = "insurance";
private readonly coveragePercentage: number;
constructor(coveragePercentage: number = 80);
calculate(baseAmount: number): BillingResult;
```
- **Algoritmo**: `discount = baseAmount * (coveragePercentage / 100)`. `totalAmount = baseAmount - discount`.
- **Method string**: `"Insurance - ${coveragePercentage}% coverage"`.
- **Parametrizable**: El porcentaje de cobertura se configura en el constructor (default 80%).

#### `class AgreementBilling implements BillingStrategy`
```typescript
readonly name = "agreement";
private readonly discountPercentage: number;
constructor(discountPercentage: number = 50);
calculate(baseAmount: number): BillingResult;
```
- **Algoritmo**: `discount = baseAmount * (discountPercentage / 100)`. `totalAmount = baseAmount - discount`.
- **Method string**: `"Agreement - ${discountPercentage}% discount"`.
- **Parametrizable**: El porcentaje de descuento se configura en el constructor (default 50%).

#### `class BillingContext`
```typescript
private strategy: BillingStrategy;
constructor(strategy: BillingStrategy);
setStrategy(strategy: BillingStrategy): void;
calculateBill(baseAmount: number): BillingResult;
```

| Método | Responsabilidad | Entrada | Salida |
|---|---|---|---|
| `setStrategy(strategy)` | Intercambia la estrategia en runtime | `BillingStrategy` | `void` |
| `calculateBill(baseAmount)` | Delega el cálculo a la estrategia activa | `number` | `BillingResult` |

---

### 4.8 Adaptador de seguros

#### `class ExternalInsuranceAPI` (`src/adapter/ExternalInsuranceAPI.ts`)

```typescript
verificarCobertura(cedula: string, poliza: string): ExternalInsuranceResponse;
enviarReclamacion(authCode: string, monto: number): { ok: boolean; ref: string };
```

| Método | Responsabilidad | Salida simulada | Efectos secundarios |
|---|---|---|---|
| `verificarCobertura(cedula, poliza)` | Simula verificación de cobertura | `{ cod: 200, cov: 80, auth: "AUTH-...", msg: "Cobertura activa" }` | Imprime a consola |
| `enviarReclamacion(authCode, monto)` | Simula envío de reclamación | `{ ok: true, ref: "REF-..." }` | Imprime a consola |

#### `class InsuranceAdapter implements InsurancePort` (`src/adapter/InsuranceAdapter.ts`)

```typescript
private readonly externalApi: ExternalInsuranceAPI;
constructor(externalApi: ExternalInsuranceAPI);
verifyCoverage(patientId: string, policyNumber: string): CoverageResult;
submitClaim(authorizationCode: string, amount: number): ClaimResult;
```

| Método | Responsabilidad | Traducción realizada |
|---|---|---|
| `verifyCoverage(patientId, policyNumber)` | Verifica cobertura vía API externa y normaliza respuesta | `cod→isActive`, `cov→coveragePercentage`, `auth→authorizationCode`, `msg→message` |
| `submitClaim(authCode, amount)` | Envía reclamación vía API externa y normaliza respuesta | `ok→success`, `ref→referenceNumber` |

---

### 4.9 Repositorios (`src/repository/`)

#### `class InMemoryRepository<T extends { id: string }>` (`src/repository/Repository.ts`)

```typescript
protected readonly store: Map<string, T> = new Map();

findAll(): T[];
findById(id: string): T | undefined;
save(entity: T): void;
update(id: string, partial: Partial<T>): T | undefined;
delete(id: string): boolean;
```

| Método | Responsabilidad | Detalle de implementación | Efectos secundarios |
|---|---|---|---|
| `findAll()` | Retorna todas las entidades | `Array.from(store.values())` | Ninguno |
| `findById(id)` | Busca por ID | `store.get(id)` | Ninguno |
| `save(entity)` | Persiste o sobreescribe | `store.set(entity.id, entity)` | Muta el Map |
| `update(id, partial)` | Merge parcial | `{ ...existing, ...partial, id }` — re-aserta `id` | Muta el Map |
| `delete(id)` | Elimina por ID | `store.delete(id)` | Muta el Map |

#### `class PatientRepository extends InMemoryRepository<Patient>`

| Método adicional | Firma | Lógica |
|---|---|---|
| `findByBillingType(billingType)` | `(BillingType): Patient[]` | Filtra `findAll()` por `billingType` |
| `findByName(name)` | `(string): Patient[]` | Búsqueda case-insensitive por substring: `p.name.toLowerCase().includes(name.toLowerCase())` |

#### `class AppointmentRepository extends InMemoryRepository<Appointment>`

| Método adicional | Firma |
|---|---|
| `findByPatientId(patientId)` | `(string): Appointment[]` |
| `findByDoctorId(doctorId)` | `(string): Appointment[]` |
| `findByDate(date)` | `(string): Appointment[]` |

#### `class ClinicalRecordRepository extends InMemoryRepository<ClinicalRecord>`

| Método adicional | Firma |
|---|---|
| `findByPatientId(patientId)` | `(string): ClinicalRecord[]` |
| `findByDoctorId(doctorId)` | `(string): ClinicalRecord[]` |

#### `class InvoiceRepository extends InMemoryRepository<Invoice>`

| Método adicional | Firma |
|---|---|
| `findByPatientId(patientId)` | `(string): Invoice[]` |

---

### 4.10 `HospitalFacade` (`src/facade/HospitalFacade.ts`)

| Método | Firma | Responsabilidad | Patrones involucrados | Retorno | Efectos secundarios |
|---|---|---|---|---|---|
| `constructor()` | `()` | Inicializa todos los subsistemas | Singleton, Observer, Adapter, Repository | — | Crea instancias, suscribe observadores |
| `getHospitalInfo()` | `(): string` | Formatea info del hospital | Singleton | `string` | Ninguno |
| `registerPatient(data)` | `(data): Patient` | Crea y persiste paciente | Factory, Repository | `Patient` | `console.log`, mutación de repositorio |
| `getPatient(id)` | `(string): Patient \| undefined` | Busca paciente por ID | Repository | `Patient \| undefined` | Ninguno |
| `getAllPatients()` | `(): Patient[]` | Lista todos los pacientes | Repository | `Patient[]` | Ninguno |
| `registerDoctor(data)` | `(data): Doctor` | Crea doctor (sin persistir) | Factory | `Doctor` | Ninguno |
| `scheduleAppointment(...)` | `(patientId, doctorId, date, reason): Appointment \| null` | Agenda cita con validación | Singleton (límite diario), Repository | `Appointment \| null` | `console.log`, mutación de repositorio |
| `confirmAppointment(id)` | `(string): Appointment \| undefined` | Confirma cita y notifica | Repository, Observer | `Appointment \| undefined` | Emite evento, `console.log` via notificadores |
| `cancelAppointment(id)` | `(string): Appointment \| undefined` | Cancela cita y notifica | Repository, Observer | `Appointment \| undefined` | Emite evento, `console.log` via notificadores |
| `addClinicalRecord(data)` | `(data): ClinicalRecord` | Crea registro clínico y notifica | Repository, Observer | `ClinicalRecord` | Emite evento, `console.log` |
| `getPatientHistory(patientId)` | `(string): ClinicalRecord[]` | Consulta historial clínico | Repository | `ClinicalRecord[]` | Ninguno |
| `generateInvoice(...)` | `(patientId, appointmentId, baseAmount): Invoice \| null` | Factura con estrategia correcta | Strategy, Repository | `Invoice \| null` | `console.log`, mutación de repositorio |
| `getPatientInvoices(patientId)` | `(string): Invoice[]` | Consulta facturas de paciente | Repository | `Invoice[]` | Ninguno |
| `verifyInsurance(patientId, policyNumber)` | `(string, string): string` | Verifica cobertura vía adaptador | Adapter | `string` | `console.log` (API externa) |
| `submitInsuranceClaim(authCode, amount)` | `(string, number): string` | Envía reclamación vía adaptador | Adapter | `string` | `console.log` (API externa) |

---

### 4.11 `function main()` (`src/index.ts`)

```typescript
function main(): void
```
- **Responsabilidad**: Script de demostración que ejercita todo el sistema.
- **Entrada**: Ninguna.
- **Salida**: Todo el output va a `console.log`.
- **No exportada**: Solo se invoca inmediatamente al final del archivo (`main()`).
- **Flujo**: Ver sección 3.2 para el recorrido paso a paso.

---

## 5. Puntos críticos del diseño

### 5.1 La Facade como único punto de contacto del cliente

El `index.ts` solo importa `HospitalFacade` y `HospitalConfig`. No importa ningún repositorio, estrategia, observador, adaptador ni fábrica. Esto es intencional: si los subsistemas internos cambian (ej. se reemplaza `InMemoryRepository` por `PostgresRepository`), el `index.ts` no se modifica. El trade-off es que `HospitalFacade` concentra 15 métodos y conoce todos los subsistemas, lo que la convierte en una clase con alto acoplamiento eferente. En un sistema real de mayor escala, se podría descomponer en sub-facades (ej. `BillingFacade`, `AppointmentFacade`).

### 5.2 Los doctores no se persisten en ningún repositorio

`registerDoctor()` crea un `Doctor` vía `PersonFactory` pero **no lo guarda en ningún repositorio**. El objeto solo existe en la variable que lo recibe. Esto significa que:
- No hay forma de buscar un doctor por ID después de su creación.
- `scheduleAppointment()` recibe `doctorId` como string pero nunca valida que ese doctor exista.
- Si la referencia al doctor se pierde, no hay forma de recuperarlo.

Esto es aceptable para una demostración, pero en producción se necesitaría un `DoctorRepository`. La decisión de no incluirlo puede ser intencional para mantener el foco en los 7 patrones sin agregar más infraestructura.

### 5.3 `Appointment.status` es el único campo mutable

Todos los modelos usan `readonly` en sus campos excepto `Appointment.status`. Esto es necesario porque `InMemoryRepository.update()` hace un merge con spread (`{ ...existing, ...partial }`), y el campo actualizado necesita ser asignable. Sin embargo, el spread crea un nuevo objeto de todas formas, por lo que `readonly` en el tipo de la interfaz no impediría la operación a nivel de runtime (TypeScript `readonly` es solo un check en tiempo de compilación). La decisión de declarar `status` como mutable es una señal semántica al desarrollador de que ese campo está diseñado para cambiar.

### 5.4 El Observer filtra por tipo de evento, no por observador

El `ClinicalEventEmitter` usa un `Map<ClinicalEventType, ClinicalObserver[]>` en lugar de una lista plana de observadores que reciben todos los eventos. Esto significa que:
- Un `EmailNotifier` suscrito a `"appointment:confirmed"` y `"appointment:cancelled"` aparece en dos entradas distintas del Map.
- Cada `emit()` solo itera los observadores del tipo específico, no todos.
- El costo es O(k) donde k es el número de observadores del tipo dado, no O(n*m) donde n es el total de observadores y m es el total de tipos.

Este diseño es superior al Observer clásico donde el sujeto llama `update()` en todos los observadores y cada uno debe determinar internamente si le interesa el evento.

### 5.5 `BillingContext.setStrategy()` existe pero nunca se invoca

La Facade crea un nuevo `BillingContext` por cada invocación de `generateInvoice()`, pasando la estrategia correcta directamente al constructor:

```typescript
const billingContext = new BillingContext(strategyMap[patient.billingType]);
const result = billingContext.calculateBill(baseAmount);
```

El método `setStrategy()` no se usa. Esta es una decisión consciente: el contexto no necesita mutar su estrategia porque su ciclo de vida es de una sola operación. El método existe para escenarios donde un `BillingContext` de vida larga necesitara cambiar de estrategia (ej. un paciente que cambia de aseguradora durante una sesión).

### 5.6 Estrategias de facturación parametrizables vía constructor

`InsuranceBilling` y `AgreementBilling` aceptan un porcentaje en su constructor (default 80% y 50% respectivamente). La Facade usa los defaults, pero el diseño permite instanciar `new InsuranceBilling(70)` para una aseguradora con 70% de cobertura. Esto es extensibilidad sin crear nuevas clases: una misma clase sirve para múltiples configuraciones.

### 5.7 `InMemoryRepository.update()` protege el `id`

La implementación de `update()` re-aserta el `id` original después del spread:

```typescript
const updated = { ...existing, ...partial, id } as T;
```

Si `partial` incluyera `{ id: "otro-valor" }`, sería ignorado. Esto previene un bug sutil donde un update accidental del ID rompería la integridad del `Map` (el nuevo ID no coincidiría con la key).

### 5.8 `PushNotifier` como extensibilidad latente

`PushNotifier` está implementado pero no suscrito a ningún evento en la Facade. Su existencia demuestra que agregar un nuevo canal de notificación no requiere modificar ningún código existente: solo crear la clase e invocar `subscribe()`. Esto es el Principio Abierto/Cerrado (OCP) en acción.

### 5.9 El Adapter protege contra cambios en la API externa

Si la aseguradora cambia su respuesta de `{ cod: 200 }` a `{ statusCode: "OK" }`, solo se modifica `InsuranceAdapter.verifyCoverage()`. Ni la Facade, ni los repositorios, ni el `index.ts` se tocan. La interfaz `InsurancePort` actúa como contrato estable del lado del dominio.

### 5.10 Generación de fechas con `toISOString().split("T")[0]!`

En `addClinicalRecord()`, la fecha se obtiene como:
```typescript
date: new Date().toISOString().split("T")[0]!
```
El `!` (non-null assertion) es necesario porque `split()` retorna `string[]` y TypeScript no puede garantizar estáticamente que el índice `[0]` exista. En la práctica, `toISOString()` siempre produce un string con formato `YYYY-MM-DDTHH:mm:ss.sssZ`, por lo que `split("T")[0]` nunca es `undefined`. El assertion es seguro pero vale la pena documentar por qué.

---

## 6. Dependencias y configuración

### 6.1 Dependencias

El proyecto tiene **cero dependencias de producción**. Todas las dependencias son de desarrollo:

| Paquete | Versión | Rol |
|---|---|---|
| `typescript` | ^5.9.3 | Compilador TypeScript. Transpila el código de `src/` a JavaScript en `dist/`. |
| `ts-node` | ^10.9.2 | Motor de ejecución TypeScript para Node.js. Permite ejecutar archivos `.ts` directamente sin compilación previa (usado en el script `start`). |
| `@types/node` | ^25.3.5 | Definiciones de tipos TypeScript para las APIs de Node.js (`node:crypto` para `randomUUID`, `console`, `Date`, etc.). |

La única API de Node.js utilizada en runtime es `randomUUID()` de `node:crypto` (en `PersonFactory` y `HospitalFacade`).

### 6.2 Configuración TypeScript (`tsconfig.json`)

| Opción | Valor | Significado |
|---|---|---|
| `target` | `ES2022` | Genera JavaScript compatible con ES2022 (incluye `structuredClone`, `Array.at()`, etc.) |
| `module` | `CommonJS` | Sistema de módulos CommonJS (`require`/`module.exports`) |
| `strict` | `true` | Todas las comprobaciones estrictas habilitadas (`strictNullChecks`, `noImplicitAny`, etc.) |
| `rootDir` | `./src` | Directorio raíz del código fuente |
| `outDir` | `./dist` | Directorio de salida para el código compilado |
| `sourceMap` | `true` | Genera archivos `.js.map` para debugging |
| `declaration` | `true` | Genera archivos `.d.ts` con tipos |

El `package.json` usa `"type": "commonjs"` (valor por defecto en Node.js). Las importaciones internas usan rutas relativas sin extensión (ej. `import { PersonFactory } from "../factory/PersonFactory"`).

### 6.3 Scripts NPM

| Script | Comando | Descripción |
|---|---|---|
| `build` | `tsc` | Compila TypeScript a JavaScript en `dist/` |
| `start` | `ts-node src/index.ts` | Ejecuta TypeScript directamente (sin compilación previa) |

### 6.4 Instalación y ejecución

```bash
# Clonar el repositorio
git clone <repositorio>
cd hospital-management

# Instalar dependencias
npm install

# Opción 1: Ejecutar directamente (modo desarrollo)
npm start

# Opción 2: Compilar y ejecutar
npm run build
node dist/index.js
```

---

## 7. Ejemplo de uso

### Ejecución completa

Al ejecutar `npm start`, el programa produce la siguiente salida (los UUIDs varían en cada ejecución):

```
============================================================
  HOSPITAL MANAGEMENT SYSTEM — DEMO
============================================================

--- 1. Hospital Configuration (Singleton) ---
Hospital Central UTP | Hours: 07:00-19:00 | Emergency: 911
Updated config: Hospital Universitario UTP | Hours: 07:00-19:00 | Emergency: 911

--- 2. Register Patients (Factory Method) ---
[HOSPITAL] Patient registered: Carlos Mendez (a1b2c3d4-...)
[HOSPITAL] Patient registered: Ana Torres (e5f6g7h8-...)
[HOSPITAL] Patient registered: Luis Ramirez (i9j0k1l2-...)
Total patients: 3

--- 3. Register Doctor (Factory Method) ---
Doctor registered: Dra. Maria Lopez — Cardiology

--- 4. Appointments & Notifications (Observer) ---
[HOSPITAL] Appointment scheduled: m3n4o5p6-...
[HOSPITAL] Appointment scheduled: q7r8s9t0-...

Confirming appointment 1:
[EMAIL] To patient a1b2c3d4-...: Your appointment on 2026-03-10 has been confirmed. (appointment:confirmed)
[SMS] To patient a1b2c3d4-...: Your appointment on 2026-03-10 has been confirmed. (appointment:confirmed)

Cancelling appointment 2:
[EMAIL] To patient e5f6g7h8-...: Your appointment on 2026-03-10 has been cancelled. (appointment:cancelled)

--- 5. Clinical Records (Repository + Observer) ---
[EMAIL] To patient a1b2c3d4-...: Clinical record updated: Mild hypertension (clinical:update)
[HOSPITAL] Clinical record added: u1v2w3x4-...
Clinical records for Carlos Mendez: 1

--- 6. Billing (Strategy) ---
[HOSPITAL] Invoice generated: $100000.00 (Insurance - 80% coverage)
  Carlos Mendez: Base=$500000 | Discount=$400000 | Total=$100000
[HOSPITAL] Invoice generated: $500000.00 (Private - Full payment)
  Ana Torres: Base=$500000 | Discount=$0 | Total=$500000
[HOSPITAL] Appointment scheduled: y5z6a7b8-...
[HOSPITAL] Invoice generated: $250000.00 (Agreement - 50% discount)
  Luis Ramirez: Base=$500000 | Discount=$250000 | Total=$250000

--- 7. Insurance Integration (Adapter) ---
[EXTERNAL API] Verifying coverage for ID a1b2c3d4-..., policy POL-12345
  Coverage: Coverage active: 80% — Auth: AUTH-1741504800000
[EXTERNAL API] Submitting claim: auth=AUTH-001, amount=100000
  Claim: Claim submitted successfully. Reference: REF-1741504800001

--- 8. Patient Invoice Summary (Repository) ---
  Carlos Mendez: 1 invoice(s), Total: $100000
  Ana Torres: 1 invoice(s), Total: $500000
  Luis Ramirez: 1 invoice(s), Total: $250000

============================================================
  DEMO COMPLETE
============================================================
```

### Desglose de facturación por tipo de paciente

**Paciente 1 — Carlos Mendez (Insurance)**:
```
billingType = "insurance" → InsuranceBilling(80)
baseAmount    = $500,000
coveragePct   = 80%
discount      = 500,000 × 0.80 = $400,000
totalAmount   = 500,000 - 400,000 = $100,000
billingMethod = "Insurance - 80% coverage"
```

**Paciente 2 — Ana Torres (Private)**:
```
billingType = "private" → PrivateBilling()
baseAmount    = $500,000
discount      = $0
totalAmount   = $500,000
billingMethod = "Private - Full payment"
```

**Paciente 3 — Luis Ramirez (Agreement)**:
```
billingType = "agreement" → AgreementBilling(50)
baseAmount    = $500,000
discountPct   = 50%
discount      = 500,000 × 0.50 = $250,000
totalAmount   = 500,000 - 250,000 = $250,000
billingMethod = "Agreement - 50% discount"
```

### Flujo del Adapter en detalle

```
hospital.verifyInsurance("a1b2c3d4", "POL-12345")
  │
  ▼
InsuranceAdapter.verifyCoverage("a1b2c3d4", "POL-12345")
  │
  ├── Llama: ExternalInsuranceAPI.verificarCobertura("a1b2c3d4", "POL-12345")
  │   └── Retorna: { cod: 200, cov: 80, auth: "AUTH-1741504800000", msg: "Cobertura activa" }
  │
  └── Traduce a: {
        isActive: true,              // cod === 200
        coveragePercentage: 80,      // cov
        authorizationCode: "AUTH-...",// auth
        message: "Cobertura activa"  // msg
      }
  │
  ▼
HospitalFacade formatea:
  "Coverage active: 80% — Auth: AUTH-1741504800000"
```
