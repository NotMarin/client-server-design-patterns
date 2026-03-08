# Sistema de Reservas para Aerolínea

Sistema empresarial de reservas aéreas implementado en **TypeScript** que integra cuatro patrones de diseño (Builder, Strategy, State y Observer) en una arquitectura cohesiva, desacoplada y extensible.

---

## Estructura del Proyecto

```
src/
├── enums/
│   └── index.ts                  # Enumeraciones: SeatClass, ReservationEvent, Season
├── models/
│   ├── Passenger.ts              # Datos del pasajero
│   ├── Flight.ts                 # Información del vuelo
│   ├── Seat.ts                   # Asiento con clase y disponibilidad
│   ├── AdditionalService.ts      # Servicio adicional (equipaje extra, comida, Wi-Fi)
│   └── Reservation.ts            # Objeto central que integra los 4 patrones
├── state/
│   ├── ReservationState.ts       # Interfaz del patrón State
│   ├── PendingState.ts           # Estado: Pendiente
│   ├── ConfirmedState.ts         # Estado: Confirmada
│   ├── CancelledState.ts         # Estado: Cancelada
│   ├── CheckedInState.ts         # Estado: Check-in realizado
│   └── BoardedState.ts           # Estado: Abordada
├── strategy/
│   ├── PricingStrategy.ts        # Interfaz del patrón Strategy
│   ├── EconomyPricing.ts         # Estrategia: tarifa económica
│   ├── PremiumPricing.ts         # Estrategia: tarifa premium
│   └── FirstClassPricing.ts      # Estrategia: tarifa primera clase
├── observer/
│   ├── ReservationObserver.ts    # Interfaz del patrón Observer
│   ├── EmailNotifier.ts          # Notificador por correo electrónico
│   ├── SMSNotifier.ts            # Notificador por SMS
│   └── AppNotifier.ts            # Notificador por aplicación móvil
├── builder/
│   └── ReservationBuilder.ts     # Builder con API fluida para construir reservas
└── main.ts                       # Punto de entrada: demostración completa
```

---

## Ejecución

```bash
npm install
npm run build
npm start
```

---

## Resumen de lo Implementado

### Patrón Builder — `ReservationBuilder`

Se implementó un builder con **API fluida** que permite construir objetos `Reservation` paso a paso, configurando pasajero, vuelo, asiento, precio base, servicios adicionales, estrategia de precios y observadores. Esto evita constructores telescópicos y garantiza que el objeto resultante sea consistente antes de utilizarse. El builder valida que todos los campos obligatorios estén presentes al momento de invocar `build()`.

### Patrón Strategy — Cálculo dinámico de precios

Se encapsularon tres algoritmos de cálculo de tarifa en clases independientes:

| Estrategia          | Multiplicador base | Descuento por anticipación | Factor temporada alta |
| ------------------- | ------------------ | -------------------------- | --------------------- |
| `EconomyPricing`    | ×1.0               | Hasta 15%                  | ×1.3                  |
| `PremiumPricing`    | ×2.0               | No aplica                  | ×1.4                  |
| `FirstClassPricing` | ×4.0               | No aplica                  | ×1.5                  |

Cada reserva puede cambiar su estrategia de precios **en tiempo de ejecución** sin modificar la lógica central, lo que facilita agregar nuevas tarifas futuras.

### Patrón State — Ciclo de vida de la reserva

Se modelaron cinco estados como clases separadas, cada una definiendo qué operaciones son válidas:

```
PENDING ──confirm──→ CONFIRMED ──checkIn──→ CHECKED_IN ──board──→ BOARDED
   │                     │                      │
   └──cancel──→ CANCELLED ←──cancel──┘ ←──cancel──┘
                     ↑
   CONFIRMED ──modify──→ PENDING
```

Reglas de negocio implementadas:

- Solo se pueden modificar reservas en estado **Pendiente** o **Confirmada**.
- Las reservas canceladas no permiten ninguna operación posterior.
- El check-in solo es posible desde el estado **Confirmada**.
- El abordaje solo es posible desde el estado **Check-in realizado**.

### Patrón Observer — Notificaciones desacopladas

Tres canales de notificación (`EmailNotifier`, `SMSNotifier`, `AppNotifier`) se suscriben a la reserva y son notificados automáticamente ante cualquier evento (confirmación, cancelación, check-in, abordaje, modificación, upgrade). El núcleo del sistema no depende de implementaciones específicas de mensajería.

---

## Preguntas de Reflexión

### 1. ¿Qué problemas genera usar múltiples condicionales para estados?

Usar cadenas de `if/else` o `switch` para manejar estados genera **código frágil y difícil de mantener**. Cada nuevo estado requiere modificar todas las funciones que contienen la lógica condicional, violando el Principio Abierto/Cerrado (OCP). Además, la lógica de cada estado queda dispersa en múltiples métodos lo que genera baja cohesión; se dificulta saber qué transiciones son válidas; y crece el riesgo de errores al olvidar un caso en algún `switch`. El patrón State resuelve esto encapsulando el comportamiento de cada estado en su propia clase, haciendo que agregar un nuevo estado (por ejemplo, "Lista de espera" u "Overbooking") sea tan simple como crear una nueva clase sin tocar las existentes.

### 2. ¿Cómo facilita Builder la creación de reservas complejas?

Una reserva involucra múltiples componentes (pasajero, vuelo, asiento, servicios, estrategia de precios, observadores). Sin el Builder, se necesitaría un constructor con muchos parámetros donde el orden importa y algunos son opcionales, lo que se conoce como **constructores telescópicos**. El Builder ofrece una **API fluida** (`setPassenger().setFlight().setSeat().build()`) donde cada paso es explícito a la vez que el método `build()` valida la consistencia del objeto antes de crearlo. Esto mejora la legibilidad, reduce errores y permite crear configuraciones variadas del mismo tipo de objeto.

### 3. ¿Qué ocurre si cambian las reglas de precio?

Gracias al patrón Strategy, las reglas de precio están **encapsuladas en clases independientes**. Si cambia la fórmula de cálculo de la tarifa económica, solo se modifica `EconomyPricing`; si se agrega una nueva tarifa (por ejemplo, "Business Flex"), se crea una nueva clase que implemente `PricingStrategy` sin modificar la clase `Reservation` ni ninguna otra estrategia existente. Esto cumple con el principio OCP y minimiza el riesgo de regresiones.

### 4. ¿Cómo desacoplar notificaciones?

El patrón Observer desacopla el **emisor** (la reserva) de los **receptores** (canales de notificación). La reserva solo conoce la interfaz `ReservationObserver` y notifica a todos los observadores registrados sin saber si el mensaje va por email, SMS o push notification. Para agregar un nuevo canal (por ejemplo, WhatsApp o Slack), basta crear una clase que implemente la interfaz y registrarla como observador; no se modifica ningún código existente.

### 5. ¿Qué patrón mejora cohesión en cambios de estado?

El patrón **State** mejora directamente la cohesión porque cada clase de estado agrupa **todo el comportamiento específico** de ese estado en un solo lugar. Por ejemplo, `ConfirmedState` sabe exactamente qué hacer ante un intento de check-in, cancelación o modificación. Esto contrasta con la alternativa de dispersar esa lógica en condicionales a través de múltiples métodos de la clase `Reservation`, lo que resultaría en baja cohesión y alto acoplamiento.
