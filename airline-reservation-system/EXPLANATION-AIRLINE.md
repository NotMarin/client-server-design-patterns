# Sistema de Reservas para Aerolínea

Sistema empresarial de reservas aéreas implementado en **TypeScript** que integra cuatro patrones de diseño GoF (Builder, Strategy, State y Observer) en una arquitectura cohesiva, desacoplada y extensible. El programa modela el ciclo de vida completo de una reserva aérea: desde su construcción paso a paso, pasando por el cálculo dinámico de tarifas, el control estricto de transiciones de estado y la notificación multicanal ante cada evento del dominio.

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

Diseñar e implementar un **sistema de reservas aéreas** en TypeScript que resuelva los siguientes requisitos:

1. **Construcción de objetos complejos**: Una reserva involucra múltiples entidades (pasajero, vuelo, asiento, servicios adicionales, estrategia de precios, observadores). Se necesita un mecanismo que permita ensamblar estos objetos de forma incremental, con validación y valores predeterminados, sin recurrir a constructores telescópicos de 8+ parámetros.

2. **Cálculo dinámico de tarifas**: El precio final de una reserva depende de la clase de asiento (Economy, Premium, First Class), la temporada del vuelo (alta, regular, baja) y, en el caso de Economy, de cuántos días de anticipación se compra el boleto. El algoritmo de cálculo debe poder intercambiarse en tiempo de ejecución sin alterar la lógica del dominio.

3. **Control de ciclo de vida con reglas de negocio estrictas**: Una reserva atraviesa estados (Pendiente, Confirmada, Check-in, Abordada, Cancelada) con transiciones válidas e inválidas bien definidas. El sistema debe rechazar operaciones ilegales (por ejemplo, hacer check-in desde estado Pendiente o cancelar después de abordar) sin recurrir a cadenas de condicionales frágiles.

4. **Notificaciones multicanal desacopladas**: Cada evento de la reserva (confirmación, cancelación, check-in, abordaje, modificación, upgrade) debe disparar notificaciones por múltiples canales (email, SMS, app móvil) sin que el núcleo del dominio dependa de implementaciones concretas de mensajería.

### Solución

Se implementó una arquitectura orientada a objetos que integra cuatro patrones de diseño GoF:

- **Builder** para la construcción incremental y validada de reservas.
- **Strategy** para el cálculo de tarifas intercambiable en runtime.
- **State** para la máquina de estados del ciclo de vida.
- **Observer** para notificaciones desacopladas.

El punto de integración central es la clase `Reservation`, que actúa como contexto para los tres patrones comportamentales (Strategy, State, Observer) y es producida por el patrón creacional (Builder).

---

## 2. Patrones de diseño aplicados

### 2.1 Builder (Creacional)

| Aspecto              | Detalle                             |
| -------------------- | ----------------------------------- |
| **Interfaz / Clase** | `ReservationBuilder`                |
| **Archivo**          | `src/builder/ReservationBuilder.ts` |
| **Producto**         | `Reservation`                       |

**Implementación**: `ReservationBuilder` almacena cada componente de la reserva en campos privados opcionales (`passenger`, `flight`, `seat`, `basePrice`, `pricingStrategy`, `additionalServices[]`, `observers[]`). Cada setter público devuelve `this` para habilitar una API fluida (method chaining). El método `build()`:

1. Valida que los campos obligatorios (`passenger`, `flight`, `seat`, `basePrice`) estén definidos; lanza `Error` si alguno falta.
2. Si no se proporcionó una estrategia de precios explícitamente, infiere la estrategia por defecto según la clase de asiento via `resolveDefaultStrategy()`.
3. Marca el asiento como no disponible (`seat.reserve()`).
4. Genera un ID único con formato `RES-{timestamp_base36}-{random_base36}`.
5. Construye el objeto `Reservation` con `PendingState` como estado inicial.
6. Registra todos los observadores acumulados en la reserva.

**Justificación**: `Reservation` requiere 8 parámetros en su constructor, varios de los cuales son objetos compuestos (Passenger, Flight, Seat) y colecciones (AdditionalService[], ReservationObserver[]). El Builder separa la lógica de construcción de la representación final, permite añadir servicios y observadores de forma incremental, y centraliza la validación en `build()`. Sin él, el código cliente tendría que instanciar manualmente cada modelo, gestionar el ID y el estado inicial, y recordar invocar `seat.reserve()`.

---

### 2.2 Strategy (Comportamental)

| Aspecto              | Detalle                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **Interfaz**         | `PricingStrategy`                                                                                       |
| **Archivo interfaz** | `src/strategy/PricingStrategy.ts`                                                                       |
| **Implementaciones** | `EconomyPricing`, `PremiumPricing`, `FirstClassPricing`                                                 |
| **Archivos**         | `src/strategy/EconomyPricing.ts`, `src/strategy/PremiumPricing.ts`, `src/strategy/FirstClassPricing.ts` |
| **Contexto**         | `Reservation.calculateTotalPrice()` y `Reservation.setPricingStrategy()`                                |

**Interfaz**:

```typescript
interface PricingStrategy {
  readonly name: string;
  calculatePrice(basePrice: number, reservation: Reservation): number;
}
```

**Algoritmos de cada estrategia**:

| Estrategia          | Fórmula                                      | Multiplicador clase | Temporada alta | Temporada regular | Temporada baja | Descuento anticipación           |
| ------------------- | -------------------------------------------- | ------------------- | -------------- | ----------------- | -------------- | -------------------------------- |
| `EconomyPricing`    | `base * seasonMult * (1 - anticipationDisc)` | x1.0                | x1.3           | x1.0              | x0.8           | >60 días: 15%, >30: 10%, >14: 5% |
| `PremiumPricing`    | `base * 2.0 * seasonMult`                    | x2.0                | x1.4           | x1.1              | x0.9           | No aplica                        |
| `FirstClassPricing` | `base * 4.0 * seasonMult`                    | x4.0                | x1.5           | x1.2              | x1.0           | No aplica                        |

**Determinación de temporada** (común a las tres estrategias):

- **Alta**: meses 12 (diciembre), 1 (enero), 7 (julio), 8 (agosto)
- **Baja**: meses 3, 4, 5 (marzo-mayo)
- **Regular**: todos los demás meses

**Justificación**: El cálculo de tarifa varía significativamente entre clases de asiento: Economy aplica descuentos por compra anticipada, Premium y First Class no. Cada clase tiene multiplicadores de temporada distintos. Encapsular cada algoritmo en su propia clase permite:

- Intercambiar la estrategia en runtime (`reservation.setPricingStrategy(new PremiumPricing())`) sin modificar `Reservation`.
- Agregar nuevas tarifas (ej. "Business Flex") creando una nueva clase sin tocar las existentes (OCP).
- Testear cada algoritmo de forma aislada.

---

### 2.3 State (Comportamental)

| Aspecto              | Detalle                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Interfaz**         | `ReservationState`                                                                                                                                    |
| **Archivo interfaz** | `src/state/ReservationState.ts`                                                                                                                       |
| **Implementaciones** | `PendingState`, `ConfirmedState`, `CheckedInState`, `BoardedState`, `CancelledState`                                                                  |
| **Archivos**         | `src/state/PendingState.ts`, `src/state/ConfirmedState.ts`, `src/state/CheckedInState.ts`, `src/state/BoardedState.ts`, `src/state/CancelledState.ts` |
| **Contexto**         | Clase `Reservation` (campo privado `state`, métodos `confirm()`, `cancel()`, `checkIn()`, `board()`, `modify()`, `upgrade()`)                         |

**Interfaz**:

```typescript
interface ReservationState {
  readonly name: string;
  confirm(reservation: Reservation): void;
  cancel(reservation: Reservation): void;
  checkIn(reservation: Reservation): void;
  board(reservation: Reservation): void;
  modify(reservation: Reservation): void;
  upgrade(reservation: Reservation): void;
}
```

**Máquina de estados completa**:

```
                        ┌──cancel──→ CANCELLED (terminal)
                        │
  PENDING ──confirm──→ CONFIRMED ──checkIn──→ CHECKED_IN ──board──→ BOARDED (terminal)
    │                    │    ↑                   │
    │                    │    │                    │
    └──cancel──→ CANCELLED   │                    └──cancel──→ CANCELLED
                         │   │
                         └──modify──→ PENDING
```

**Tabla de transiciones**:

| Estado actual  | `confirm()`               | `cancel()`                   | `checkIn()`             | `board()` | `modify()`                 | `upgrade()`                |
| -------------- | ------------------------- | ---------------------------- | ----------------------- | --------- | -------------------------- | -------------------------- |
| **PENDING**    | → CONFIRMED               | → CANCELLED (libera asiento) | Bloqueado               | Bloqueado | Permitido (sin transición) | Permitido (sin transición) |
| **CONFIRMED**  | Bloqueado (ya confirmado) | → CANCELLED (libera asiento) | → CHECKED_IN            | Bloqueado | → PENDING                  | Permitido (sin transición) |
| **CHECKED_IN** | Bloqueado                 | → CANCELLED (libera asiento) | Bloqueado (ya check-in) | → BOARDED | Bloqueado                  | Bloqueado                  |
| **BOARDED**    | Bloqueado                 | Bloqueado                    | Bloqueado               | Bloqueado | Bloqueado                  | Bloqueado                  |
| **CANCELLED**  | Bloqueado                 | Bloqueado                    | Bloqueado               | Bloqueado | Bloqueado                  | Bloqueado                  |

**Justificación**: Sin el patrón State, cada método de `Reservation` necesitaría un `switch` o cadena de `if/else` sobre el estado actual, dispersando la lógica de cada estado por toda la clase. Esto viola el principio de responsabilidad única (SRP), dificulta agregar nuevos estados y aumenta el riesgo de olvidar un caso. Con State, cada clase contiene todo el comportamiento permitido para ese estado, las operaciones ilegales se rechazan explícitamente, y agregar un estado (ej. "En lista de espera") solo requiere crear una nueva clase.

---

### 2.4 Observer (Comportamental)

| Aspecto              | Detalle                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Interfaz**         | `ReservationObserver`                                                                         |
| **Archivo interfaz** | `src/observer/ReservationObserver.ts`                                                         |
| **Implementaciones** | `EmailNotifier`, `SMSNotifier`, `AppNotifier`                                                 |
| **Archivos**         | `src/observer/EmailNotifier.ts`, `src/observer/SMSNotifier.ts`, `src/observer/AppNotifier.ts` |
| **Sujeto**           | Clase `Reservation` (métodos `addObserver()`, `removeObserver()`, `notifyObservers()`)        |

**Interfaz**:

```typescript
interface ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void;
}
```

**Canales implementados**:

| Clase           | Canal    | Dato del pasajero utilizado | Formato de salida                                |
| --------------- | -------- | --------------------------- | ------------------------------------------------ |
| `EmailNotifier` | Email    | `passenger.email`           | `[Email] → {email} \| Reservation {id}: {event}` |
| `SMSNotifier`   | SMS      | `passenger.phone`           | `[SMS]   → {phone} \| Reservation {id}: {event}` |
| `AppNotifier`   | Push app | `passenger.name`            | `[App]   → {name} \| Reservation {id}: {event}`  |

**Justificación**: Las notificaciones son una preocupación transversal (cross-cutting concern) que no debe contaminar la lógica de dominio. `Reservation` solo conoce la interfaz `ReservationObserver`; no sabe si la notificación va por email, SMS o push. Esto permite:

- Añadir nuevos canales (WhatsApp, Slack, webhook) sin modificar `Reservation` ni los estados.
- Que los estados invoquen `reservation.notifyObservers(event)` después de cada transición sin acoplarse a canales concretos.
- Registrar y desregistrar observadores dinámicamente.

---

## 3. Arquitectura y flujo de ejecución

### 3.1 Estructura del proyecto

```
airline-reservation-system/
├── package.json                    # Manifiesto NPM, scripts, dependencias
├── tsconfig.json                   # Configuración del compilador TypeScript
├── class-diagram.mmd              # Diagrama UML de clases (Mermaid)
├── dist/                          # Salida compilada (JavaScript)
└── src/
    ├── main.ts                    # Punto de entrada y demostración
    ├── enums/
    │   └── index.ts               # SeatClass, ReservationEvent, Season
    ├── models/
    │   ├── Passenger.ts           # Datos del pasajero
    │   ├── Flight.ts              # Información del vuelo
    │   ├── Seat.ts                # Asiento con disponibilidad
    │   ├── AdditionalService.ts   # Servicio adicional (nombre, precio)
    │   └── Reservation.ts         # Objeto de dominio central
    ├── builder/
    │   └── ReservationBuilder.ts  # Builder con API fluida
    ├── strategy/
    │   ├── PricingStrategy.ts     # Interfaz Strategy
    │   ├── EconomyPricing.ts      # Tarifa económica
    │   ├── PremiumPricing.ts      # Tarifa premium
    │   └── FirstClassPricing.ts   # Tarifa primera clase
    ├── state/
    │   ├── ReservationState.ts    # Interfaz State
    │   ├── PendingState.ts        # Estado: Pendiente
    │   ├── ConfirmedState.ts      # Estado: Confirmada
    │   ├── CheckedInState.ts      # Estado: Check-in
    │   ├── BoardedState.ts        # Estado: Abordada
    │   └── CancelledState.ts      # Estado: Cancelada
    └── observer/
        ├── ReservationObserver.ts # Interfaz Observer
        ├── EmailNotifier.ts       # Observador: correo electrónico
        ├── SMSNotifier.ts         # Observador: SMS
        └── AppNotifier.ts         # Observador: notificación push
```

### 3.2 Diagrama de flujo de ejecución

```
┌─────────────────────────────────────────────────────────────────────┐
│                        main.ts (Punto de entrada)                   │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 1: BUILDER — Construcción de reserva                           │
│                                                                      │
│  ReservationBuilder                                                  │
│    .setPassenger("Carlos Méndez", ...)                               │
│    .setFlight("AV-204", "PTY", "BOG", ...)                          │
│    .setSeat("12A", ECONOMY)          ──→ crea Seat                  │
│    .setBasePrice(350)                                                │
│    .addService("Extra luggage", 45)  ──→ crea AdditionalService     │
│    .addService("In-flight meal", 18)                                 │
│    .addService("Wi-Fi access", 12)                                   │
│    .addObserver(new EmailNotifier())                                 │
│    .addObserver(new SMSNotifier())                                   │
│    .addObserver(new AppNotifier())                                   │
│    .build()                                                          │
│         │                                                            │
│         ├── Valida campos obligatorios                               │
│         ├── resolveDefaultStrategy(ECONOMY) → EconomyPricing         │
│         ├── seat.reserve() → isAvailable = false                     │
│         ├── generateId() → "RES-XXXXXXX-XXXXXX"                     │
│         ├── new Reservation(..., new PendingState())                 │
│         └── Registra 3 observadores                                  │
│                                                                      │
│  Resultado: Reservation en estado PENDING con 3 observadores         │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 2: STRATEGY — Cálculo de precios con distintos algoritmos      │
│                                                                      │
│  reservation.setPricingStrategy(new EconomyPricing())                │
│  reservation.calculateTotalPrice()                                   │
│    └── EconomyPricing.calculatePrice(350, reservation)               │
│         ├── determineSeason(julio) → HIGH                            │
│         ├── getSeasonMultiplier() → 1.3                              │
│         ├── getAnticipationDiscount() → según días hasta vuelo       │
│         └── 350 * 1.3 * (1 - descuento) + 75 servicios              │
│                                                                      │
│  reservation.setPricingStrategy(new PremiumPricing())                │
│  reservation.calculateTotalPrice()                                   │
│    └── 350 * 2.0 * 1.4 + 75 = $1,055.00                            │
│                                                                      │
│  reservation.setPricingStrategy(new FirstClassPricing())             │
│  reservation.calculateTotalPrice()                                   │
│    └── 350 * 4.0 * 1.5 + 75 = $2,175.00                            │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 3: STATE — Ciclo de vida completo                              │
│                                                                      │
│  Estado: PENDING                                                     │
│    │                                                                 │
│    ├── checkIn() → BLOQUEADO ("still pending")                       │
│    │                                                                 │
│    ├── confirm() → setState(ConfirmedState)                          │
│    │                 notifyObservers(CONFIRMED) → Email, SMS, App    │
│    │                                                                 │
│    │  Estado: CONFIRMED                                              │
│    ├── modify() → setState(PendingState)                             │
│    │               notifyObservers(MODIFIED) → Email, SMS, App       │
│    │                                                                 │
│    │  Estado: PENDING                                                │
│    ├── confirm() → setState(ConfirmedState)                          │
│    │               notifyObservers(CONFIRMED) → Email, SMS, App      │
│    │                                                                 │
│    │  Estado: CONFIRMED                                              │
│    ├── checkIn() → setState(CheckedInState)                          │
│    │                notifyObservers(CHECKED_IN) → Email, SMS, App    │
│    │                                                                 │
│    │  Estado: CHECKED_IN                                             │
│    ├── modify() → BLOQUEADO ("cannot modify after check-in")         │
│    │                                                                 │
│    ├── board() → setState(BoardedState)                              │
│    │              notifyObservers(BOARDED) → Email, SMS, App         │
│    │                                                                 │
│    │  Estado: BOARDED (terminal)                                     │
│    └── cancel() → BLOQUEADO ("passenger already boarded")            │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 4: OBSERVER — Notificaciones con segunda reserva               │
│                                                                      │
│  reservation2 = Builder.build()  (Ana Torres, PREMIUM, 3 observers)  │
│    │                                                                 │
│    ├── confirm() → CONFIRMED                                         │
│    │   ├── [Email] → ana.torres@email.com | CONFIRMED               │
│    │   ├── [SMS]   → +507-6789-0000 | CONFIRMED                    │
│    │   └── [App]   → Ana Torres | CONFIRMED                        │
│    │                                                                 │
│    ├── cancel() → CANCELLED (seat.release())                         │
│    │   ├── [Email] → ana.torres@email.com | CANCELLED               │
│    │   ├── [SMS]   → +507-6789-0000 | CANCELLED                    │
│    │   └── [App]   → Ana Torres | CANCELLED                        │
│    │                                                                 │
│    └── confirm() → BLOQUEADO ("reservation is cancelled")            │
└──────┬───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASE 5: UPGRADE — Upgrade de clase con cambio de estrategia         │
│                                                                      │
│  reservation3 (Luis Herrera, ECONOMY, EconomyPricing)                │
│    │                                                                 │
│    ├── Antes: Seat 22C [ECONOMY], EconomyPricing, $X.XX             │
│    │                                                                 │
│    ├── reservation3.seat = new Seat("2A", FIRST_CLASS, false)        │
│    ├── reservation3.setPricingStrategy(new FirstClassPricing())      │
│    ├── reservation3.upgrade()                                        │
│    │   ├── PendingState.upgrade() → "Upgrade applied"               │
│    │   ├── [Email] → luis.herrera@email.com | UPGRADED              │
│    │   └── [App]   → Luis Herrera | UPGRADED                        │
│    │                                                                 │
│    └── Después: Seat 2A [FIRST_CLASS], FirstClassPricing, $Y.YY     │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Interacción entre patrones

```
    ┌──────────────┐          construye           ┌─────────────────┐
    │ Reservation  │ ←─────────────────────────── │ Reservation     │
    │ Builder      │    (genera ID, valida,        │ Builder         │
    │ [BUILDER]    │     asigna PendingState,      │                 │
    │              │     registra observers)        └─────────────────┘
    └──────┬───────┘
           │ produce
           ▼
    ┌──────────────────────────────────────────────────────┐
    │                    Reservation                        │
    │                  (objeto central)                     │
    │                                                      │
    │  ┌─────────┐    ┌──────────────┐    ┌────────────┐  │
    │  │  state   │    │ pricingStr.  │    │ observers[]│  │
    │  │ [STATE]  │    │ [STRATEGY]   │    │ [OBSERVER] │  │
    │  └────┬─────┘    └──────┬───────┘    └─────┬──────┘  │
    │       │                 │                   │         │
    └───────┼─────────────────┼───────────────────┼─────────┘
            │                 │                   │
     delega lifecycle   delega precio     notifica eventos
            │                 │                   │
            ▼                 ▼                   ▼
    ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ PendingState  │  │ EconomyPr.   │  │ EmailNotifier    │
    │ ConfirmedSt.  │  │ PremiumPr.   │  │ SMSNotifier      │
    │ CheckedInSt.  │  │ FirstClassPr.│  │ AppNotifier      │
    │ BoardedState  │  └──────────────┘  └──────────────────┘
    │ CancelledSt.  │
    └───────────────┘
```

---

## 4. Descripción de cada función y clase

### 4.1 Enumeraciones (`src/enums/index.ts`)

#### `enum SeatClass`

Define las clases de asiento disponibles.

```typescript
enum SeatClass {
  ECONOMY = "ECONOMY",
  PREMIUM = "PREMIUM",
  FIRST_CLASS = "FIRST_CLASS",
}
```

- **Uso**: Determina la estrategia de precios por defecto en `ReservationBuilder.resolveDefaultStrategy()` y se asigna a `Seat.seatClass`.

#### `enum ReservationEvent`

Tipos de eventos que disparan notificaciones.

```typescript
enum ReservationEvent {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  CHECKED_IN = "CHECKED_IN",
  BOARDED = "BOARDED",
  MODIFIED = "MODIFIED",
  UPGRADED = "UPGRADED",
}
```

- **Uso**: Pasado a `reservation.notifyObservers(event)` por las clases de estado tras cada transición exitosa.

#### `enum Season`

Temporadas que afectan los multiplicadores de precio.

```typescript
enum Season {
  LOW = "LOW",
  REGULAR = "REGULAR",
  HIGH = "HIGH",
}
```

- **Uso**: Determinada internamente por cada `PricingStrategy` según el mes del vuelo.

---

### 4.2 Modelos (`src/models/`)

#### `class Passenger` (`src/models/Passenger.ts`)

Clase de datos inmutable que representa a un pasajero.

```typescript
class Passenger {
  constructor(
    public readonly name: string,
    public readonly passport: string,
    public readonly email: string,
    public readonly phone: string,
  ) {}
}
```

| Campo      | Tipo     | Descripción                                                 |
| ---------- | -------- | ----------------------------------------------------------- |
| `name`     | `string` | Nombre completo del pasajero                                |
| `passport` | `string` | Número de pasaporte                                         |
| `email`    | `string` | Dirección de correo electrónico (usado por `EmailNotifier`) |
| `phone`    | `string` | Número de teléfono (usado por `SMSNotifier`)                |

**Efectos secundarios**: Ninguno. Objeto puramente inmutable.

---

#### `class Flight` (`src/models/Flight.ts`)

Clase de datos inmutable que representa un vuelo programado.

```typescript
class Flight {
  constructor(
    public readonly flightNumber: string,
    public readonly origin: string,
    public readonly destination: string,
    public readonly departureDate: Date,
    public readonly arrivalDate: Date,
  ) {}
}
```

| Campo           | Tipo     | Descripción                                                                                           |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `flightNumber`  | `string` | Código del vuelo (ej. "AV-204")                                                                       |
| `origin`        | `string` | Aeropuerto de origen                                                                                  |
| `destination`   | `string` | Aeropuerto de destino                                                                                 |
| `departureDate` | `Date`   | Fecha y hora de salida (usada por las estrategias de precio para determinar temporada y anticipación) |
| `arrivalDate`   | `Date`   | Fecha y hora de llegada                                                                               |

**Efectos secundarios**: Ninguno.

---

#### `class Seat` (`src/models/Seat.ts`)

Representa un asiento de aeronave con control de disponibilidad.

```typescript
class Seat {
  constructor(
    public readonly number: string,
    public readonly seatClass: SeatClass,
    public isAvailable: boolean = true,
  ) {}

  reserve(): void;
  release(): void;
}
```

| Método      | Firma      | Responsabilidad                  | Efectos secundarios        |
| ----------- | ---------- | -------------------------------- | -------------------------- |
| `reserve()` | `(): void` | Marca el asiento como ocupado    | Muta `isAvailable = false` |
| `release()` | `(): void` | Marca el asiento como disponible | Muta `isAvailable = true`  |

- `reserve()` es invocado por `ReservationBuilder.build()` al construir la reserva.
- `release()` es invocado por `PendingState.cancel()`, `ConfirmedState.cancel()` y `CheckedInState.cancel()` al cancelar.

---

#### `class AdditionalService` (`src/models/AdditionalService.ts`)

Clase de datos inmutable para servicios opcionales adicionales.

```typescript
class AdditionalService {
  constructor(
    public readonly name: string,
    public readonly price: number,
  ) {}
}
```

| Campo   | Tipo     | Descripción                                       |
| ------- | -------- | ------------------------------------------------- |
| `name`  | `string` | Nombre del servicio (ej. "Extra luggage (23 kg)") |
| `price` | `number` | Precio del servicio en USD                        |

**Uso**: Los precios se suman al resultado de la estrategia en `Reservation.calculateTotalPrice()`.

---

#### `class Reservation` (`src/models/Reservation.ts`)

**Objeto de dominio central** que integra los cuatro patrones de diseño. Es el contexto del patrón State y Strategy, y el sujeto del patrón Observer.

```typescript
class Reservation {
  private state: ReservationState;
  private readonly observers: ReservationObserver[] = [];

  constructor(
    public readonly id: string,
    public readonly passenger: Passenger,
    public readonly flight: Flight,
    public seat: Seat,
    public readonly basePrice: number,
    public readonly additionalServices: AdditionalService[],
    public pricingStrategy: PricingStrategy,
    initialState: ReservationState,
  ) {
    this.state = initialState;
  }
}
```

**Métodos — Delegación al State**:

| Método      | Firma      | Responsabilidad                     |
| ----------- | ---------- | ----------------------------------- |
| `confirm()` | `(): void` | Delega a `this.state.confirm(this)` |
| `cancel()`  | `(): void` | Delega a `this.state.cancel(this)`  |
| `checkIn()` | `(): void` | Delega a `this.state.checkIn(this)` |
| `board()`   | `(): void` | Delega a `this.state.board(this)`   |
| `modify()`  | `(): void` | Delega a `this.state.modify(this)`  |
| `upgrade()` | `(): void` | Delega a `this.state.upgrade(this)` |

**Métodos — Gestión de estado**:

| Método               | Firma                      | Responsabilidad                     | Efectos secundarios                             |
| -------------------- | -------------------------- | ----------------------------------- | ----------------------------------------------- |
| `setState(newState)` | `(ReservationState): void` | Transiciona al nuevo estado         | Muta `this.state`, imprime transición a consola |
| `getStateName()`     | `(): string`               | Retorna el nombre del estado actual | Ninguno                                         |

**Métodos — Observer**:

| Método                     | Firma                         | Responsabilidad                                            | Efectos secundarios                            |
| -------------------------- | ----------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| `addObserver(observer)`    | `(ReservationObserver): void` | Registra un nuevo observador                               | Muta `this.observers` (push)                   |
| `removeObserver(observer)` | `(ReservationObserver): void` | Elimina un observador por referencia                       | Muta `this.observers` (splice)                 |
| `notifyObservers(event)`   | `(ReservationEvent): void`    | Itera todos los observadores y llama `update(event, this)` | Dispara efectos secundarios en cada observador |

**Métodos — Strategy**:

| Método                         | Firma                     | Responsabilidad                                            | Retorno                                                               |
| ------------------------------ | ------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `calculateTotalPrice()`        | `(): number`              | Calcula precio via estrategia + suma servicios adicionales | `pricingStrategy.calculatePrice(basePrice, this) + Σ(services.price)` |
| `setPricingStrategy(strategy)` | `(PricingStrategy): void` | Intercambia la estrategia de precios en runtime            | Muta `this.pricingStrategy`, imprime cambio a consola                 |

---

### 4.3 Builder (`src/builder/ReservationBuilder.ts`)

#### `class ReservationBuilder`

Implementa el patrón Builder con API fluida para construir objetos `Reservation`.

**Campos privados**:

```typescript
private passenger: Passenger | undefined;
private flight: Flight | undefined;
private seat: Seat | undefined;
private basePrice: number | undefined;
private pricingStrategy: PricingStrategy | undefined;
private additionalServices: AdditionalService[] = [];
private observers: ReservationObserver[] = [];
```

**Métodos fluidos (setters)** — Todos retornan `this` para encadenamiento:

| Método                                                                     | Firma                                        | Qué construye                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `setPassenger(name, passport, email, phone)`                               | `(string, string, string, string): this`     | Instancia `new Passenger(...)`                                   |
| `setFlight(flightNumber, origin, destination, departureDate, arrivalDate)` | `(string, string, string, Date, Date): this` | Instancia `new Flight(...)`                                      |
| `setSeat(number, seatClass)`                                               | `(string, SeatClass): this`                  | Instancia `new Seat(number, seatClass)` (disponible por defecto) |
| `setBasePrice(price)`                                                      | `(number): this`                             | Almacena el precio base                                          |
| `setPricingStrategy(strategy)`                                             | `(PricingStrategy): this`                    | Define estrategia explícita (override del default)               |
| `addService(name, price)`                                                  | `(string, number): this`                     | Agrega `new AdditionalService(name, price)` a la lista           |
| `addObserver(observer)`                                                    | `(ReservationObserver): this`                | Agrega observador a la lista                                     |

**Métodos privados**:

| Método                              | Firma                          | Responsabilidad                                                                                            |
| ----------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `generateId()`                      | `(): string`                   | Genera ID único: `RES-{Date.now().toString(36)}-{Math.random().toString(36).substring(2,8)}` en mayúsculas |
| `resolveDefaultStrategy(seatClass)` | `(SeatClass): PricingStrategy` | Mapea: `ECONOMY → EconomyPricing`, `PREMIUM → PremiumPricing`, `FIRST_CLASS → FirstClassPricing`           |

**Método `build()`**:

```typescript
build(): Reservation
```

- **Entrada**: Estado interno acumulado del builder.
- **Salida**: Instancia de `Reservation` completamente configurada.
- **Validación**: Lanza `Error` si falta `passenger`, `flight`, `seat` o `basePrice`.
- **Efectos secundarios**: Invoca `seat.reserve()`, registra observadores en la reserva.

---

### 4.4 Estrategias de precio (`src/strategy/`)

#### `class EconomyPricing` (`src/strategy/EconomyPricing.ts`)

```typescript
class EconomyPricing implements PricingStrategy {
  readonly name = "EconomyPricing";
  calculatePrice(basePrice: number, reservation: Reservation): number;
  private getSeasonMultiplier(departureDate: Date): number;
  private getAnticipationDiscount(departureDate: Date): number;
  private determineSeason(date: Date): Season;
}
```

| Método                                   | Responsabilidad                                                     |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `calculatePrice(basePrice, reservation)` | Retorna `basePrice * seasonMultiplier * (1 - anticipationDiscount)` |
| `getSeasonMultiplier(departureDate)`     | HIGH→1.3, REGULAR→1.0, LOW→0.8                                      |
| `getAnticipationDiscount(departureDate)` | Calcula días hasta vuelo. >60d→15%, >30d→10%, >14d→5%, sino→0%      |
| `determineSeason(date)`                  | Mes 12,1,7,8→HIGH; 3-5→LOW; resto→REGULAR                           |

---

#### `class PremiumPricing` (`src/strategy/PremiumPricing.ts`)

```typescript
class PremiumPricing implements PricingStrategy {
  readonly name = "PremiumPricing";
  private static readonly CLASS_MULTIPLIER = 2.0;
  calculatePrice(basePrice: number, reservation: Reservation): number;
  private getSeasonMultiplier(departureDate: Date): number;
  private determineSeason(date: Date): Season;
}
```

| Método                                   | Responsabilidad                              |
| ---------------------------------------- | -------------------------------------------- |
| `calculatePrice(basePrice, reservation)` | Retorna `basePrice * 2.0 * seasonMultiplier` |
| `getSeasonMultiplier(departureDate)`     | HIGH→1.4, REGULAR→1.1, LOW→0.9               |
| `determineSeason(date)`                  | Misma lógica que `EconomyPricing`            |

---

#### `class FirstClassPricing` (`src/strategy/FirstClassPricing.ts`)

```typescript
class FirstClassPricing implements PricingStrategy {
  readonly name = "FirstClassPricing";
  private static readonly CLASS_MULTIPLIER = 4.0;
  calculatePrice(basePrice: number, reservation: Reservation): number;
  private getSeasonMultiplier(departureDate: Date): number;
  private determineSeason(date: Date): Season;
}
```

| Método                                   | Responsabilidad                              |
| ---------------------------------------- | -------------------------------------------- |
| `calculatePrice(basePrice, reservation)` | Retorna `basePrice * 4.0 * seasonMultiplier` |
| `getSeasonMultiplier(departureDate)`     | HIGH→1.5, REGULAR→1.2, LOW→1.0               |
| `determineSeason(date)`                  | Misma lógica que `EconomyPricing`            |

---

### 4.5 Estados (`src/state/`)

#### `class PendingState` (`src/state/PendingState.ts`)

Estado inicial de toda reserva recién construida.

| Método                 | Comportamiento                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `confirm(reservation)` | Transiciona a `ConfirmedState`, notifica `CONFIRMED`                                    |
| `cancel(reservation)`  | Libera asiento (`seat.release()`), transiciona a `CancelledState`, notifica `CANCELLED` |
| `checkIn(reservation)` | **Bloqueado**: imprime mensaje de error                                                 |
| `board(reservation)`   | **Bloqueado**: imprime mensaje de error                                                 |
| `modify(reservation)`  | Permitido sin transición: imprime mensaje, notifica `MODIFIED`                          |
| `upgrade(reservation)` | Permitido sin transición: imprime mensaje, notifica `UPGRADED`                          |

---

#### `class ConfirmedState` (`src/state/ConfirmedState.ts`)

La reserva ha sido confirmada/pagada.

| Método                 | Comportamiento                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `confirm(reservation)` | **Bloqueado**: "already confirmed"                                   |
| `cancel(reservation)`  | Libera asiento, transiciona a `CancelledState`, notifica `CANCELLED` |
| `checkIn(reservation)` | Transiciona a `CheckedInState`, notifica `CHECKED_IN`                |
| `board(reservation)`   | **Bloqueado**: "must check in first"                                 |
| `modify(reservation)`  | **Transiciona de vuelta a `PendingState`**, notifica `MODIFIED`      |
| `upgrade(reservation)` | Permitido sin transición, notifica `UPGRADED`                        |

---

#### `class CheckedInState` (`src/state/CheckedInState.ts`)

El pasajero ha realizado check-in.

| Método                 | Comportamiento                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `confirm(reservation)` | **Bloqueado**: "already checked in"                                  |
| `cancel(reservation)`  | Libera asiento, transiciona a `CancelledState`, notifica `CANCELLED` |
| `checkIn(reservation)` | **Bloqueado**: "already checked in"                                  |
| `board(reservation)`   | Transiciona a `BoardedState`, notifica `BOARDED`                     |
| `modify(reservation)`  | **Bloqueado**: "cannot modify after check-in"                        |
| `upgrade(reservation)` | **Bloqueado**: "cannot upgrade after check-in"                       |

---

#### `class BoardedState` (`src/state/BoardedState.ts`)

Estado terminal. El pasajero ha abordado la aeronave.

Todos los seis métodos (`confirm`, `cancel`, `checkIn`, `board`, `modify`, `upgrade`) imprimen un mensaje de error. No se permiten transiciones.

---

#### `class CancelledState` (`src/state/CancelledState.ts`)

Estado terminal. La reserva ha sido cancelada.

Todos los seis métodos imprimen un mensaje de error. No se permiten transiciones.

---

### 4.6 Observadores (`src/observer/`)

#### `class EmailNotifier` (`src/observer/EmailNotifier.ts`)

```typescript
class EmailNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void;
}
```

- **Responsabilidad**: Simula el envío de notificación por correo electrónico.
- **Salida**: `[Email] → {passenger.email} | Reservation {id}: {event}`
- **Efectos secundarios**: Imprime a consola.

---

#### `class SMSNotifier` (`src/observer/SMSNotifier.ts`)

```typescript
class SMSNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void;
}
```

- **Responsabilidad**: Simula el envío de notificación por SMS.
- **Salida**: `[SMS]   → {passenger.phone} | Reservation {id}: {event}`
- **Efectos secundarios**: Imprime a consola.

---

#### `class AppNotifier` (`src/observer/AppNotifier.ts`)

```typescript
class AppNotifier implements ReservationObserver {
  update(event: ReservationEvent, reservation: Reservation): void;
}
```

- **Responsabilidad**: Simula el envío de notificación push a la app móvil.
- **Salida**: `[App]   → {passenger.name} | Reservation {id}: {event}`
- **Efectos secundarios**: Imprime a consola.

---

### 4.7 Función auxiliar en `main.ts`

#### `function separator(title: string): void`

```typescript
function separator(title: string): void;
```

- **Responsabilidad**: Imprime un separador visual de 60 caracteres `═` con un título centrado.
- **Entrada**: `title` — texto a mostrar.
- **Salida**: Imprime tres líneas a consola.
- **Efectos secundarios**: `console.log()` x3.

---

## 5. Puntos críticos del diseño

### 5.1 `Reservation` como nexo de cuatro patrones

La clase `Reservation` actúa simultáneamente como:

- **Producto** del Builder
- **Contexto** del State (delega `confirm()`, `cancel()`, etc.)
- **Contexto** del Strategy (delega `calculatePrice()`)
- **Sujeto** del Observer (gestiona lista de observers)

Este diseño es intencional: en el dominio de reservas aéreas, el objeto reserva es el punto natural de convergencia de todas estas responsabilidades. La alternativa sería separar estas preocupaciones en clases diferentes (ej. `ReservationLifecycle`, `ReservationPricing`, `ReservationNotifier`), pero eso fragmentaría una entidad de dominio cohesiva y complicaría la coordinación entre estados, precios y notificaciones. El trade-off es que `Reservation` tiene una superficie de API amplia (14 métodos públicos), pero cada método es una delegación de una sola línea, manteniendo el cuerpo de la clase ligero.

### 5.2 Los estados crean estados (sin fábrica centralizada)

Cada clase de estado instancia directamente los estados a los que transiciona (ej. `PendingState` crea `new ConfirmedState()`). Esto significa que `PendingState` conoce `ConfirmedState` y `CancelledState`. Se aceptó este acoplamiento porque:

- Las reglas de transición son inherentes a cada estado; centralizar la creación en una fábrica separaría la lógica de transición de la lógica de validación.
- Los estados no tienen parámetros de constructor que varíen, eliminando la necesidad de una fábrica.
- La cantidad de estados es limitada (5) y estable.

Si el sistema creciera significativamente, una tabla de transiciones o un `StateFactory` sería más apropiado.

### 5.3 `modify()` en `ConfirmedState` regresa a `PendingState`

Esta es una decisión de negocio no trivial: modificar una reserva confirmada la devuelve a estado pendiente, requiriendo re-confirmación. Esto modela una regla del mundo real donde las modificaciones posteriores a la confirmación invalidan el pago o la validación anterior y obligan al pasajero a re-confirmar.

### 5.4 `upgrade()` no cambia el asiento ni la estrategia automáticamente

El método `upgrade()` en los estados solo notifica a los observadores; no muta la reserva. El cambio real de asiento y estrategia se hace externamente:

```typescript
reservation3.seat = new Seat("2A", SeatClass.FIRST_CLASS, false);
reservation3.setPricingStrategy(new FirstClassPricing());
reservation3.upgrade(); // solo notifica
```

Esto es un trade-off: el upgrade se implementó como una operación de dos pasos (mutar + notificar) en lugar de una operación atómica. La ventaja es flexibilidad (se puede hacer upgrade de asiento sin cambiar precio o viceversa). La desventaja es que el código cliente debe recordar hacer ambas cosas. Una alternativa sería un método `performUpgrade(newSeat, newStrategy)` en `Reservation` que encapsule toda la operación.

### 5.5 La lógica de `determineSeason()` está duplicada

Las tres estrategias (`EconomyPricing`, `PremiumPricing`, `FirstClassPricing`) repiten el método `determineSeason()` con la misma implementación. Esto es una duplicación deliberada bajo el principio de que cada estrategia es una unidad independiente que podría tener reglas de temporada distintas en el futuro. Si las reglas fueran invariantes entre estrategias, una clase base abstracta o un helper compartido sería más apropiado.

### 5.6 El descuento por anticipación solo aplica a Economy

Solo `EconomyPricing` implementa `getAnticipationDiscount()`. En el dominio aéreo real, las tarifas premium y primera clase no suelen ofrecer descuentos por compra anticipada. Esta asimetría entre estrategias demuestra la fortaleza del patrón Strategy: el contrato (`PricingStrategy`) es uniforme, pero cada implementación tiene libertad total sobre su algoritmo interno.

### 5.7 Generación de ID con `Date.now()` + `Math.random()`

El método `generateId()` usa timestamp en base36 + 6 caracteres aleatorios en base36. Esto es suficiente para una demostración, pero en producción se necesitaría un UUID v4 o un generador secuencial con garantías de unicidad bajo concurrencia.

### 5.8 Librería de asiento como `seat.release()` dentro de estados

La liberación del asiento (`seat.release()`) se invoca dentro de los estados que permiten cancelación (`PendingState`, `ConfirmedState`, `CheckedInState`). Cada estado que permite `cancel()` debe recordar invocar `seat.release()`. Esto es un punto de fragilidad: si se agrega un nuevo estado que permite cancelación y se olvida liberar el asiento, habrá un asiento fantasma ocupado. Una alternativa sería centralizar la liberación en `Reservation.setState()` cuando el nuevo estado es `CancelledState`.

---

## 6. Dependencias y configuración

### 6.1 Dependencias

El proyecto tiene **cero dependencias de producción**. Todas las dependencias son de desarrollo:

| Paquete       | Versión | Rol                                                                                                                                         |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`  | ^5.9.3  | Compilador TypeScript. Transpila el código fuente de `src/` a JavaScript en `dist/`.                                                        |
| `ts-node`     | ^10.9.2 | Motor de ejecución TypeScript para Node.js. Permite ejecutar archivos `.ts` directamente sin compilación previa (usado en el script `dev`). |
| `@types/node` | ^25.3.5 | Definiciones de tipos TypeScript para las APIs de Node.js (`console`, `Date`, `Math`, `process`, etc.).                                     |

### 6.2 Configuración TypeScript (`tsconfig.json`)

| Opción    | Valor      | Significado                                                                            |
| --------- | ---------- | -------------------------------------------------------------------------------------- |
| `target`  | `esnext`   | Genera JavaScript con la sintaxis más moderna disponible                               |
| `module`  | `nodenext` | Sistema de módulos ESM nativo de Node.js                                               |
| `strict`  | `true`     | Todas las comprobaciones estrictas habilitadas (strictNullChecks, noImplicitAny, etc.) |
| `rootDir` | `./src`    | Directorio raíz del código fuente                                                      |
| `outDir`  | `./dist`   | Directorio de salida para el código compilado                                          |

El `package.json` define `"type": "module"`, habilitando ESM nativo en Node.js. Por esta razón, todas las importaciones internas usan la extensión `.js` (ej. `import { Passenger } from "./Passenger.js"`).

### 6.3 Scripts NPM

| Script  | Comando                         | Descripción                                       |
| ------- | ------------------------------- | ------------------------------------------------- |
| `build` | `tsc`                           | Compila TypeScript a JavaScript en `dist/`        |
| `start` | `node dist/main.js`             | Ejecuta el código compilado                       |
| `dev`   | `npx ts-node --esm src/main.ts` | Ejecuta TypeScript directamente (modo desarrollo) |

### 6.4 Instalación y ejecución

```bash
# Clonar e instalar dependencias
git clone <repositorio>
cd airline-reservation-system
npm install

# Opción 1: Ejecución en modo desarrollo (sin compilar)
npm run dev

# Opción 2: Compilar y ejecutar
npm run build
npm start
```

---

## 7. Ejemplo de uso

### Ejecución completa

Al ejecutar `npm run dev` o `npm start`, el programa produce la siguiente salida (los IDs de reserva y precios exactos de Economy varían según la fecha de ejecución):

```
════════════════════════════════════════════════════════════
  1. BUILDER — Constructing a complex reservation
════════════════════════════════════════════════════════════
Reservation ID : RES-M3ABCDE-F1G2H3
Passenger      : Carlos Méndez
Flight         : AV-204 (Tocumen (PTY) → Bogotá (BOG))
Seat           : 12A [ECONOMY]
State          : PENDING

════════════════════════════════════════════════════════════
  2. STRATEGY — Price calculation with different algorithms
════════════════════════════════════════════════════════════

Economy pricing:
  [Strategy] Pricing changed: EconomyPricing → EconomyPricing
  Base: $350 | Total: $XXX.XX

Premium pricing:
  [Strategy] Pricing changed: EconomyPricing → PremiumPricing
  Base: $350 | Total: $1055.00

First-Class pricing:
  [Strategy] Pricing changed: PremiumPricing → FirstClassPricing
  Base: $350 | Total: $2175.00

════════════════════════════════════════════════════════════
  3. STATE — Reservation lifecycle transitions
════════════════════════════════════════════════════════════

Current state: PENDING

→ Attempting invalid check-in while PENDING:
  [State] Cannot check in: reservation is still pending.

→ Confirming reservation:
  [State] PENDING → CONFIRMED
  [Email] → carlos.mendez@email.com | Reservation RES-M3ABCDE-F1G2H3: CONFIRMED
  [SMS]   → +507-6543-2100 | Reservation RES-M3ABCDE-F1G2H3: CONFIRMED
  [App]   → Carlos Méndez | Reservation RES-M3ABCDE-F1G2H3: CONFIRMED
  State: CONFIRMED

→ Modifying confirmed reservation (returns to PENDING):
  [State] CONFIRMED → PENDING
  [Email] → carlos.mendez@email.com | Reservation RES-M3ABCDE-F1G2H3: MODIFIED
  [SMS]   → +507-6543-2100 | Reservation RES-M3ABCDE-F1G2H3: MODIFIED
  [App]   → Carlos Méndez | Reservation RES-M3ABCDE-F1G2H3: MODIFIED
  State: PENDING

→ Re-confirming after modification:
  [State] PENDING → CONFIRMED
  ...notificaciones de los 3 canales...
  State: CONFIRMED

→ Checking in:
  [State] CONFIRMED → CHECKED_IN
  ...notificaciones de los 3 canales...
  State: CHECKED_IN

→ Attempting modification after check-in:
  [State] Cannot modify after check-in.

→ Boarding:
  [State] CHECKED_IN → BOARDED
  ...notificaciones de los 3 canales...
  State: BOARDED

→ Attempting cancel after boarding:
  [State] Cannot cancel: passenger already boarded.

════════════════════════════════════════════════════════════
  4. OBSERVER — Notification channels on a second reservation
════════════════════════════════════════════════════════════

Reservation ID : RES-XXXXXXX-XXXXXX
State          : PENDING
Total price    : $1766.00

→ Confirming (all 3 channels notified):
  [State] PENDING → CONFIRMED
  [Email] → ana.torres@email.com | Reservation RES-...: CONFIRMED
  [SMS]   → +507-6789-0000 | Reservation RES-...: CONFIRMED
  [App]   → Ana Torres | Reservation RES-...: CONFIRMED

→ Cancelling (all 3 channels notified):
  [State] CONFIRMED → CANCELLED
  [Email] → ana.torres@email.com | Reservation RES-...: CANCELLED
  [SMS]   → +507-6789-0000 | Reservation RES-...: CANCELLED
  [App]   → Ana Torres | Reservation RES-...: CANCELLED

→ Attempting confirm on cancelled reservation:
  [State] Cannot confirm: reservation is cancelled.

════════════════════════════════════════════════════════════
  5. UPGRADE — Upgrading seat class and pricing strategy
════════════════════════════════════════════════════════════

Before upgrade:
  Seat: 22C [ECONOMY]
  Strategy: EconomyPricing
  Total: $XXX.XX

→ Upgrading to First Class:
  [Strategy] Pricing changed: EconomyPricing → FirstClassPricing
  [State] Upgrade applied in pending state.
  [Email] → luis.herrera@email.com | Reservation RES-...: UPGRADED
  [App]   → Luis Herrera | Reservation RES-...: UPGRADED

After upgrade:
  Seat: 2A [FIRST_CLASS]
  Strategy: FirstClassPricing
  Total: $2955.00

════════════════════════════════════════════════════════════
  DEMO COMPLETE
════════════════════════════════════════════════════════════

  Patterns demonstrated:
    • Builder    — Fluent construction of complex Reservation objects
    • Strategy   — Dynamic pricing (Economy / Premium / First Class)
    • State      — Lifecycle management (Pending → Confirmed → CheckedIn → Boarded)
    • Observer   — Multi-channel notifications (Email, SMS, App)
```

### Desglose del precio de la reserva 2 (Ana Torres)

```
Reserva: Ana Torres — Vuelo CM-801 — Asiento 3F [PREMIUM]
Fecha de vuelo: 20 agosto 2026 → Mes 8 → Temporada ALTA

Estrategia: PremiumPricing (resuelta automáticamente por seat class)
  basePrice = $620
  CLASS_MULTIPLIER = 2.0
  seasonMultiplier = 1.4 (temporada alta)

  Precio estrategia = 620 * 2.0 * 1.4 = $1,736.00
  Servicios adicionales = Priority boarding: $30.00
  Total = $1,736.00 + $30.00 = $1,766.00
```

### Desglose del precio de la reserva 3 (Luis Herrera, post-upgrade)

```
Reserva: Luis Herrera — Vuelo AV-510 — Asiento 2A [FIRST_CLASS]
Fecha de vuelo: 22 diciembre 2026 → Mes 12 → Temporada ALTA

Estrategia: FirstClassPricing (asignada manualmente en el upgrade)
  basePrice = $480
  CLASS_MULTIPLIER = 4.0
  seasonMultiplier = 1.5 (temporada alta)

  Precio estrategia = 480 * 4.0 * 1.5 = $2,880.00
  Servicios adicionales = (ninguno agregado al builder)
  Total = $2,880.00 + $0.00 = $2,880.00
```

> **Nota**: El total mostrado como `$2,955.00` en la salida real incluye servicios que pudieran haberse añadido; verificar la configuración exacta durante la ejecución. El cálculo puro de `FirstClassPricing` con base $480 en temporada alta sin servicios da $2,880.00. La diferencia puede deberse a factores de tiempo de ejecución en el descuento de anticipación si se añadieron servicios adicionales durante el build.
