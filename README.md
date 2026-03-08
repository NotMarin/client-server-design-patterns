# Patrones de Diseño en TypeScript

Colección de tres sistemas empresariales implementados en TypeScript que demuestran la aplicación práctica de patrones de diseño GoF (Gang of Four) en dominios reales. Cada proyecto integra múltiples patrones en una arquitectura cohesiva, desacoplada y extensible.

## Proyectos

| Proyecto                                                  | Dominio                | Patrones                                                                   |
| --------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| [Airline Reservation System](#airline-reservation-system) | Reservas aéreas        | Builder, Strategy, State, Observer                                         |
| [Hospital Management](#hospital-management)               | Gestión hospitalaria   | Singleton, Factory Method, Observer, Strategy, Facade, Adapter, Repository |
| [Intelligent Inventory](#intelligent-inventory)           | Inventario inteligente | Facade, Singleton, Factory Method, Observer, Strategy, Adapter, Repository |

---

## Airline Reservation System

Sistema de reservas aéreas que modela el ciclo de vida completo de una reserva: desde la construcción fluida del objeto, pasando por transiciones de estado (pendiente, confirmada, checked-in, abordada, cancelada), hasta el cálculo dinámico de precios por clase y temporada, con notificaciones multicanal.

### Patrones implementados

| Patrón       | Propósito                                                               | Clases clave                                                                                             |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Builder**  | Construcción paso a paso de reservas complejas con API fluida           | `ReservationBuilder`                                                                                     |
| **Strategy** | Algoritmos de pricing intercambiables por clase de asiento y temporada  | `PricingStrategy`, `EconomyPricing`, `PremiumPricing`, `FirstClassPricing`                               |
| **State**    | Máquina de estados que controla las transiciones válidas de una reserva | `ReservationState`, `PendingState`, `ConfirmedState`, `CheckedInState`, `BoardedState`, `CancelledState` |
| **Observer** | Notificaciones automáticas por múltiples canales ante cambios de estado | `ReservationObserver`, `EmailNotifier`, `SMSNotifier`, `AppNotifier`                                     |

### Ejecución

```bash
cd airline-reservation-system
npm install
npm run dev
```

---

## Hospital Management

Sistema de gestión hospitalaria que unifica el registro de pacientes y médicos, agendamiento de citas, historial clínico, facturación con estrategias de cobro diferenciadas y la integración con aseguradoras externas, todo accesible a través de una fachada simplificada.

### Patrones implementados

| Patrón             | Propósito                                                                            | Clases clave                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Singleton**      | Configuración global única del hospital                                              | `HospitalConfig`                                                                                                                        |
| **Factory Method** | Creación de entidades (pacientes, médicos, administrativos) a partir de datos crudos | `PersonFactory`                                                                                                                         |
| **Observer**       | Emisión de eventos clínicos con notificación por múltiples canales                   | `ClinicalEventEmitter`, `ClinicalObserver`, `EmailNotifier`, `SmsNotifier`, `PushNotifier`                                              |
| **Strategy**       | Facturación variable según tipo de paciente (privado, seguro, convenio)              | `BillingStrategy`, `PrivateBilling`, `InsuranceBilling`, `AgreementBilling`, `BillingContext`                                           |
| **Adapter**        | Integración con API externa de seguros traducida al dominio interno                  | `InsurancePort`, `InsuranceAdapter`, `ExternalInsuranceAPI`                                                                             |
| **Repository**     | Persistencia en memoria con repositorios genéricos y especializados                  | `Repository<T>`, `InMemoryRepository<T>`, `PatientRepository`, `AppointmentRepository`, `ClinicalRecordRepository`, `InvoiceRepository` |
| **Facade**         | Punto de entrada unificado que orquesta todos los subsistemas                        | `HospitalFacade`                                                                                                                        |

### Ejecución

```bash
cd hospital-management
npm install
npm start
```

---

## Intelligent Inventory

Sistema de inventario inteligente que monitorea niveles de stock, dispara alertas por múltiples canales cuando el inventario cae por debajo de umbrales configurables, ejecuta reabastecimiento automático con estrategias intercambiables y se integra con proveedores externos mediante un adaptador.

### Patrones implementados

| Patrón             | Propósito                                                                                | Clases clave                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Singleton**      | Configuración global de umbrales y cantidades de reorden                                 | `InventoryConfig`                                                                                        |
| **Factory Method** | Creación de productos tipados por categoría (electrónicos, alimentos, ropa, perecederos) | `ProductFactory`, `Product`, `ElectronicsProduct`, `FoodProduct`, `ClothingProduct`, `PerishableProduct` |
| **Observer**       | Alertas de stock bajo por múltiples canales extensibles                                  | `StockObserver`, `EmailAlert`, `SMSAlert`, `SlackAlert`                                                  |
| **Strategy**       | Algoritmos de reorden intercambiables en tiempo de ejecución                             | `ReorderStrategy`, `FixedReorderStrategy`, `DemandBasedReorderStrategy`, `SeasonalReorderStrategy`       |
| **Adapter**        | Integración con API externa de proveedores traducida al dominio interno                  | `Supplier`, `SupplierAdapter`, `ExternalSupplierAPI`                                                     |
| **Repository**     | Persistencia en memoria de productos                                                     | `ProductRepository`, `InMemoryProductRepository`                                                         |
| **Facade**         | Punto de entrada unificado que simplifica toda la operación del inventario               | `InventoryFacade`                                                                                        |

### Ejecución

```bash
cd intelligent-inventory
npm install
npm start
```

---

## Catálogo de Patrones

### Patrones creacionales

| Patrón             | Descripción                                                           | Usado en             |
| ------------------ | --------------------------------------------------------------------- | -------------------- |
| **Singleton**      | Garantiza una única instancia de configuración global                 | Hospital, Inventario |
| **Factory Method** | Delega la creación de objetos a un método que decide el tipo concreto | Hospital, Inventario |
| **Builder**        | Construye objetos complejos paso a paso con una interfaz fluida       | Aerolínea            |

### Patrones estructurales

| Patrón      | Descripción                                                     | Usado en             |
| ----------- | --------------------------------------------------------------- | -------------------- |
| **Adapter** | Traduce una interfaz externa incompatible al dominio interno    | Hospital, Inventario |
| **Facade**  | Provee un punto de acceso simplificado a un subsistema complejo | Hospital, Inventario |

### Patrones de comportamiento

| Patrón       | Descripción                                                             | Usado en                        |
| ------------ | ----------------------------------------------------------------------- | ------------------------------- |
| **Strategy** | Permite intercambiar algoritmos en tiempo de ejecución                  | Aerolínea, Hospital, Inventario |
| **Observer** | Notifica automáticamente a múltiples interesados ante cambios de estado | Aerolínea, Hospital, Inventario |
| **State**    | Encapsula comportamiento variable según el estado interno del objeto    | Aerolínea                       |

### Otros patrones

| Patrón         | Descripción                                                   | Usado en             |
| -------------- | ------------------------------------------------------------- | -------------------- |
| **Repository** | Abstrae el acceso a datos detrás de una interfaz de colección | Hospital, Inventario |

---

## Diagramas de Clases

Cada proyecto incluye un diagrama de clases en formato Mermaid en su raíz:

- [`airline-reservation-system/class-diagram.md`](airline-reservation-system/class-diagram.md)
- [`hospital-management/class-diagram.md`](hospital-management/class-diagram.md)
- [`intelligent-inventory/class-diagram.md`](intelligent-inventory/class-diagram.md)

---

## Tecnologías

- **Lenguaje:** TypeScript 5.x
- **Runtime:** Node.js
- **Ejecución directa:** ts-node
