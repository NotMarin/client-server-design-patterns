# Sistema de Gestión Hospitalaria

## Resumen

Este proyecto implementa un **Sistema de Gestión Hospitalaria** en TypeScript, diseñado como una solución empresarial modular y extensible que integra múltiples patrones de diseño (creacionales, estructurales y de comportamiento).

El sistema gestiona:

- **Pacientes, médicos y personal administrativo** con roles y permisos diferenciados.
- **Historial clínico** con registros de diagnósticos, tratamientos y notas médicas.
- **Agendamiento de citas** con límites diarios y cambios de estado.
- **Facturación** con estrategias diferenciadas según tipo de paciente (particular, asegurado, convenio).
- **Notificaciones automáticas** por email y SMS ante eventos clínicos.
- **Integración con sistemas externos** de aseguradoras mediante adaptadores.

## Estructura del Proyecto

```
src/
├── models/                  # Entidades del dominio
│   ├── Person.ts            # Interfaz base para personas
│   ├── Patient.ts           # Paciente
│   ├── Doctor.ts            # Médico
│   ├── AdminStaff.ts        # Personal administrativo
│   ├── Appointment.ts       # Cita médica
│   ├── ClinicalRecord.ts    # Registro clínico
│   └── Invoice.ts           # Factura
├── factory/                 # Patrón Factory Method
│   └── PersonFactory.ts     # Fábrica de personas por rol
├── config/                  # Patrón Singleton
│   └── HospitalConfig.ts    # Configuración global del hospital
├── observer/                # Patrón Observer
│   ├── ClinicalEventEmitter.ts  # Emisor de eventos clínicos
│   └── NotificationChannels.ts  # Canales: email, SMS, push
├── strategy/                # Patrón Strategy
│   └── BillingStrategy.ts   # Estrategias de facturación
├── adapter/                 # Patrón Adapter
│   ├── ExternalInsuranceAPI.ts  # API externa (no modificable)
│   └── InsuranceAdapter.ts      # Adaptador a interfaz estándar
├── repository/              # Patrón Repository
│   ├── Repository.ts            # Interfaz genérica + implementación en memoria
│   ├── PatientRepository.ts     # Repositorio de pacientes
│   ├── AppointmentRepository.ts # Repositorio de citas
│   ├── ClinicalRecordRepository.ts # Repositorio de registros clínicos
│   └── InvoiceRepository.ts     # Repositorio de facturas
├── facade/                  # Patrón Facade
│   └── HospitalFacade.ts    # Punto de entrada unificado
└── index.ts                 # Demo del sistema
```

## Patrones de Diseño Implementados

| Patrón             | Tipo           | Componente             | Propósito                                                                                     |
| ------------------ | -------------- | ---------------------- | --------------------------------------------------------------------------------------------- |
| **Factory Method** | Creacional     | `PersonFactory`        | Centraliza la creación de pacientes, médicos y administrativos. Extensible para nuevos roles. |
| **Singleton**      | Creacional     | `HospitalConfig`       | Garantiza una única instancia de configuración global accesible desde todos los módulos.      |
| **Observer**       | Comportamiento | `ClinicalEventEmitter` | Desacopla eventos clínicos de los canales de notificación (email, SMS, push).                 |
| **Strategy**       | Comportamiento | `BillingStrategy`      | Encapsula algoritmos de facturación según tipo de paciente sin modificar lógica central.      |
| **Adapter**        | Estructural    | `InsuranceAdapter`     | Normaliza la comunicación con APIs externas de aseguradoras a una interfaz uniforme.          |
| **Repository**     | Estructural    | `InMemoryRepository`   | Abstrae el acceso a datos, preparado para migrar de memoria a bases de datos.                 |
| **Facade**         | Estructural    | `HospitalFacade`       | Ofrece una interfaz simplificada que unifica registro, citas, facturación y notificaciones.   |

## Ejecución

```bash
npm install
npm start
```

## Preguntas de Reflexión

### ¿Por qué separar el acceso a datos?

Separar el acceso a datos mediante el patrón Repository permite **desacoplar la lógica de negocio de la tecnología de persistencia**. Actualmente los datos se almacenan en memoria, pero al tener una interfaz genérica (`Repository<T>`), se puede migrar a una base de datos relacional, NoSQL o un servicio externo sin modificar ninguna clase del dominio. Además, facilita las pruebas unitarias ya que se puede usar la implementación en memoria como mock.

### ¿Qué problema resuelve el patrón Adapter?

El Adapter resuelve el problema de **incompatibilidad de interfaces entre sistemas**. Las APIs externas de aseguradoras tienen formatos propietarios (nombres en español, códigos crípticos como `cod`, `cov`, `auth`) que no coinciden con la interfaz que necesita nuestro sistema. El adaptador traduce entre ambas interfaces, permitiendo que el sistema hospitalario consuma datos externos sin acoplarse a la implementación específica de cada aseguradora.

### ¿Cómo evitar acoplamiento entre módulos?

Se evita el acoplamiento mediante:

- **Interfaces bien definidas**: cada módulo expone contratos (interfaces) en lugar de implementaciones concretas.
- **Inyección de dependencias**: los componentes reciben sus dependencias en lugar de crearlas internamente.
- **Patrón Observer**: los módulos que generan eventos no conocen a los que los consumen.
- **Patrón Facade**: los clientes externos interactúan con una interfaz simplificada sin conocer la complejidad interna.

### ¿Qué patrón mejora la claridad arquitectónica?

El patrón **Facade** mejora la claridad arquitectónica al proporcionar un **punto de entrada único y simplificado** al sistema. `HospitalFacade` agrupa operaciones complejas (registro, agendamiento, facturación, notificaciones) en métodos simples e intuitivos. Cualquier equipo de front-end, aplicación móvil o portal web puede consumir el sistema sin entender la interacción interna entre fábricas, repositorios, adaptadores, estrategias y observadores.

### ¿Cómo facilitar auditorías y mantenimiento?

- **Observer**: permite registrar automáticamente cada cambio clínico y enviar notificaciones, creando un trail de auditoría natural.
- **Repository**: centraliza el acceso a datos, facilitando agregar logging o versionado de registros en un solo punto.
- **Tipado fuerte**: TypeScript detecta errores en tiempo de compilación, reduciendo bugs en producción.
- **Separación por carpetas/patrones**: cada componente tiene una responsabilidad clara, lo que facilita localizar y corregir problemas.
- **Facade**: al tener un punto de entrada único, se puede instrumentar fácilmente con logging, métricas o validaciones transversales.
