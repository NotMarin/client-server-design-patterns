# Intelligent Inventory System - Documentación Técnica Completa

## 1. Enunciado Resuelto

Este proyecto resuelve el siguiente problema:

**Diseñar e implementar un sistema inteligente de gestión de inventario** que permita registrar productos de distintas categorías (electrónica, alimentos, ropa, perecederos), monitorear niveles de stock en tiempo real, emitir alertas automáticas cuando el inventario cae por debajo de un umbral configurable, y ejecutar órdenes de reabastecimiento a proveedores externos utilizando algoritmos de cálculo intercambiables en tiempo de ejecución.

El sistema debe cumplir los siguientes requisitos funcionales:

1. **Creación polimórfica de productos**: Cada categoría de producto tiene requisitos de almacenamiento distintos. El sistema debe crear la subclase correcta sin que el código cliente conozca las clases concretas.
2. **Configuración centralizada y compartida**: Un único punto de configuración (umbral de stock mínimo, cantidad de reorden por defecto) accesible por todos los módulos del sistema.
3. **Estrategias de reorden intercambiables**: Distintos algoritmos de cálculo de cantidad a reordenar (fijo, basado en demanda, estacional) que se pueden cambiar en tiempo de ejecución sin modificar el código del gestor de inventario.
4. **Notificaciones multicanal**: Cuando un producto cae por debajo del umbral, el sistema debe notificar a múltiples canales (email, SMS, Slack, etc.) de forma desacoplada. Se deben poder agregar nuevos canales sin modificar la lógica central.
5. **Integración con proveedores externos**: El sistema debe comunicarse con APIs de proveedores que tienen interfaces incompatibles con el contrato interno, adaptando sus protocolos de forma transparente.
6. **Interfaz simplificada**: El cliente final no debe interactuar directamente con la complejidad interna (repositorios, fábricas, estrategias, observadores), sino a través de una fachada unificada.

---

## 2. Patrones de Diseño Aplicados

### 2.1 Singleton — `InventoryConfig`

| Aspecto | Detalle |
|---|---|
| **Archivo** | `src/config/InventoryConfig.ts` |
| **Clase** | `InventoryConfig` |
| **Implementación** | Constructor `private`, campo estático `instance: InventoryConfig \| null`, método estático `getInstance()` con inicialización perezosa (lazy initialization). |

**Por qué se eligió**: La configuración del sistema (umbral mínimo de stock, cantidad de reorden por defecto, nombre del sistema) debe ser **única y compartida** por todos los módulos. `FixedReorderStrategy`, `DemandBasedReorderStrategy`, `SeasonalReorderStrategy` e `InventoryManager` leen de esta misma instancia. Sin Singleton, cada módulo podría tener su propia copia de configuración, causando inconsistencias cuando se modifican los valores en tiempo de ejecución (paso 10 del demo). El Singleton garantiza que un cambio en `minStockThreshold` se refleja inmediatamente en todas las estrategias y en el monitor de inventario.

---

### 2.2 Factory Method — `ProductFactory`

| Aspecto | Detalle |
|---|---|
| **Archivo** | `src/factory/ProductFactory.ts` |
| **Clase** | `ProductFactory` |
| **Productos creados** | `ElectronicsProduct`, `FoodProduct`, `ClothingProduct`, `PerishableProduct` |
| **Modelos base** | `src/models/Product.ts` — clase abstracta `Product` y enum `ProductCategory` |

**Implementación**: Método estático `create(params: CreateProductParams): Product` con un `switch` exhaustivo sobre `ProductCategory`. El caso `default` usa una variable tipada como `never`, lo cual fuerza un error de compilación si se agrega una nueva categoría al enum sin actualizar la fábrica.

**Por qué se eligió**: Cada categoría de producto tiene comportamiento especializado (`getStorageRequirements()` retorna texto distinto). Sin la fábrica, el código cliente (`InventoryFacade.registerProduct`) tendría que conocer cada subclase concreta y usar condicionales propios. La fábrica **centraliza la lógica de instanciación**, y el chequeo exhaustivo con `never` garantiza **seguridad en tiempo de compilación** ante nuevas categorías.

---

### 2.3 Strategy — `ReorderStrategy` + 3 implementaciones concretas

| Aspecto | Detalle |
|---|---|
| **Interfaz** | `src/strategies/ReorderStrategy.ts` — `ReorderStrategy` |
| **Estrategia 1** | `src/strategies/FixedReorderStrategy.ts` — `FixedReorderStrategy` |
| **Estrategia 2** | `src/strategies/DemandBasedReorderStrategy.ts` — `DemandBasedReorderStrategy` |
| **Estrategia 3** | `src/strategies/SeasonalReorderStrategy.ts` — `SeasonalReorderStrategy` |
| **Contexto** | `src/core/InventoryManager.ts` — campo `reorderStrategy`, método `setReorderStrategy()` |

**Implementación**: `InventoryManager` mantiene una referencia a `ReorderStrategy` que se invoca en `executeReorder()`. El método `setReorderStrategy()` permite el cambio en tiempo de ejecución.

**Por qué se eligió**: El algoritmo de cálculo de cantidad a reordenar varía según el contexto del negocio. Una tienda puede usar reorden fijo para productos estables, basado en demanda para productos de alta rotación, y estacional para productos afectados por temporadas. Sin Strategy, `InventoryManager` tendría un bloque `if/else` o `switch` creciente para cada algoritmo, violando el Principio Abierto/Cerrado (OCP). Con Strategy, se agregan nuevos algoritmos creando una nueva clase que implementa `ReorderStrategy`, sin tocar `InventoryManager`.

---

### 2.4 Observer — `StockObserver` + 3 implementaciones concretas

| Aspecto | Detalle |
|---|---|
| **Interfaz** | `src/observers/StockObserver.ts` — `StockObserver` |
| **Observador 1** | `src/observers/EmailAlert.ts` — `EmailAlert` |
| **Observador 2** | `src/observers/SMSAlert.ts` — `SMSAlert` |
| **Observador 3** | `src/main.ts` (línea 13) — `SlackAlert` (definido inline para demostrar extensibilidad) |
| **Sujeto** | `src/core/InventoryManager.ts` — lista `observers[]`, métodos `addObserver()`, `removeObserver()`, `notifyObservers()` |

**Implementación**: `InventoryManager` mantiene un arreglo `observers: StockObserver[]`. Cuando `updateStock()` o `monitorInventory()` detectan stock bajo, invocan `notifyObservers()`, que itera y llama `update()` en cada observador registrado.

**Por qué se eligió**: El sistema necesita notificar a múltiples canales (email, SMS, Slack) cuando el stock es bajo, y estos canales deben poder agregarse o removerse sin modificar la lógica de detección de stock bajo. Observer desacopla completamente al emisor (`InventoryManager`) de los receptores (`EmailAlert`, `SMSAlert`, `SlackAlert`). El demo muestra cómo `SlackAlert` se agrega en tiempo de ejecución (paso 4) sin cambiar ningún archivo existente.

---

### 2.5 Adapter — `SupplierAdapter` envolviendo `ExternalSupplierAPI`

| Aspecto | Detalle |
|---|---|
| **Interfaz objetivo** | `src/adapters/Supplier.ts` — `Supplier` (contrato interno) |
| **Clase adaptada** | `src/adapters/ExternalSupplierAPI.ts` — `ExternalSupplierAPI` (API de terceros) |
| **Adaptador** | `src/adapters/SupplierAdapter.ts` — `SupplierAdapter` |

**Implementación**: `SupplierAdapter` recibe una instancia de `ExternalSupplierAPI` en su constructor. Traduce `placeOrder(productId, productName, quantity)` a `submitPurchaseOrder(itemCode, requestedQty)`, y `isAvailable(productId)` a `checkItemAvailability(itemCode)`. También verifica que el status de la respuesta sea `"ACCEPTED"` y lanza una excepción si es `"REJECTED"`.

**Por qué se eligió**: `ExternalSupplierAPI` simula una API de terceros con nombres de métodos y firmas incompatibles (`submitPurchaseOrder` vs `placeOrder`, `checkItemAvailability` vs `isAvailable`, respuesta con `qty_confirmed` y `status` vs retorno directo de `SupplierOrder`). El Adapter traduce entre ambas interfaces sin modificar ni la API externa ni el contrato interno, cumpliendo con el principio de inversión de dependencias.

---

### 2.6 Facade — `InventoryFacade`

| Aspecto | Detalle |
|---|---|
| **Archivo** | `src/facade/InventoryFacade.ts` |
| **Clase** | `InventoryFacade` |
| **Subsistemas ocultados** | `InventoryConfig`, `InMemoryProductRepository`, `InventoryManager`, `ProductFactory`, `FixedReorderStrategy`, `SupplierAdapter`, `ExternalSupplierAPI`, `EmailAlert`, `SMSAlert` |

**Implementación**: El constructor de `InventoryFacade` ensambla todo el subsistema: obtiene la instancia Singleton de configuración, crea el repositorio en memoria, instancia el proveedor por defecto (vía Adapter), la estrategia por defecto (Fixed), el `InventoryManager`, y registra los observadores por defecto (Email + SMS). Expone métodos simplificados como `registerProduct()`, `updateProductStock()`, `monitorInventory()`.

**Por qué se eligió**: Sin la fachada, `main.ts` tendría que instanciar y cablear manualmente cada componente (repositorio, estrategia, proveedor, adaptador, observadores, manager, fábrica, configuración). La fachada reduce la superficie de interacción a una sola clase con métodos semánticos. Esto es crítico para que el punto de entrada (`main.ts`) se mantenga legible y declarativo.

---

### 2.7 Repository — `ProductRepository` / `InMemoryProductRepository`

| Aspecto | Detalle |
|---|---|
| **Interfaz** | `src/repositories/ProductRepository.ts` — `ProductRepository` |
| **Implementación concreta** | `src/repositories/InMemoryProductRepository.ts` — `InMemoryProductRepository` |

**Implementación**: `InMemoryProductRepository` usa un `Map<string, Product>` como almacenamiento. Lanza excepciones si se intenta guardar un producto con ID duplicado o actualizar uno inexistente.

**Por qué se eligió**: Desacopla la lógica de dominio (`InventoryManager`) del mecanismo de persistencia. Si en el futuro se necesita una base de datos (PostgreSQL, MongoDB), solo se implementa una nueva clase que cumpla `ProductRepository`, sin modificar `InventoryManager` ni ningún otro componente. Es un patrón de arquitectura limpia que facilita testing y extensibilidad.

---

## 3. Arquitectura y Flujo de Ejecución

### 3.1 Estructura de directorios

```
src/
├── main.ts                          # Punto de entrada
├── config/
│   └── InventoryConfig.ts           # Singleton de configuración
├── models/
│   └── Product.ts                   # Clase abstracta, enum, 4 subclases
├── factory/
│   └── ProductFactory.ts            # Factory Method
├── strategies/
│   ├── ReorderStrategy.ts           # Interfaz Strategy
│   ├── FixedReorderStrategy.ts      # Estrategia fija
│   ├── DemandBasedReorderStrategy.ts # Estrategia basada en demanda
│   └── SeasonalReorderStrategy.ts   # Estrategia estacional
├── observers/
│   ├── StockObserver.ts             # Interfaz Observer
│   ├── EmailAlert.ts                # Observador email
│   └── SMSAlert.ts                  # Observador SMS
├── repositories/
│   ├── ProductRepository.ts         # Interfaz Repository
│   └── InMemoryProductRepository.ts # Repositorio en memoria
├── adapters/
│   ├── Supplier.ts                  # Interfaz del proveedor interno
│   ├── ExternalSupplierAPI.ts       # API externa (terceros)
│   └── SupplierAdapter.ts           # Adapter
├── core/
│   └── InventoryManager.ts          # Orquestador central (Sujeto Observer)
└── facade/
    └── InventoryFacade.ts           # Facade
```

### 3.2 Diagrama de flujo ASCII

```
                         ┌─────────────────┐
                         │    main.ts       │
                         │   (Punto de      │
                         │    entrada)      │
                         └────────┬─────────┘
                                  │
                         new InventoryFacade()
                                  │
                    ┌─────────────▼──────────────┐
                    │      InventoryFacade        │
                    │  ┌───────────────────────┐  │
                    │  │ Ensambla subsistemas:  │  │
                    │  │ • InventoryConfig      │◄─┼── Singleton.getInstance()
                    │  │ • InMemoryRepository   │  │
                    │  │ • SupplierAdapter      │◄─┼── Wraps ExternalSupplierAPI
                    │  │ • FixedReorderStrategy │  │
                    │  │ • InventoryManager     │  │
                    │  │ • EmailAlert + SMSAlert│  │
                    │  └───────────────────────┘  │
                    └─────────────┬───────────────┘
                                  │
              ┌───────────────────┼────────────────────┐
              │                   │                    │
     registerProduct()    updateProductStock()   monitorInventory()
              │                   │                    │
              ▼                   ▼                    ▼
     ┌────────────────┐  ┌───────────────┐   ┌────────────────┐
     │ ProductFactory  │  │ InventoryMgr  │   │ InventoryMgr   │
     │ .create()       │  │ .updateStock()│   │ .monitorAll()  │
     │                 │  │               │   │                │
     │ switch(category)│  │ quantity <    │   │ for each prod: │
     │ → Electronics   │  │ threshold?    │   │ quantity <     │
     │ → Food          │  │    │          │   │ threshold?     │
     │ → Clothing      │  │    ▼ YES      │   │    │           │
     │ → Perishable    │  │ ┌───────────┐ │   │    ▼ YES       │
     └───────┬────────┘  │ │ notify    │ │   │ ┌───────────┐  │
             │           │ │ Observers │ │   │ │ notify +  │  │
             ▼           │ └─────┬─────┘ │   │ │ reorder   │  │
     Repository.save()   │       │       │   │ └───────────┘  │
                         │       ▼       │   └────────────────┘
                         │ ┌───────────┐ │
                         │ │ execute   │ │
                         │ │ Reorder() │ │
                         │ └─────┬─────┘ │
                         └───────┼───────┘
                       ┌─────────┼─────────┐
                       │         │         │
                       ▼         ▼         ▼
              ┌──────────┐ ┌─────────┐ ┌──────────┐
              │ Strategy  │ │Supplier │ │Observers │
              │.calculate │ │.place   │ │.update() │
              │ReorderQty │ │Order()  │ │          │
              └──────────┘ └─────────┘ │• Email   │
                                       │• SMS     │
                                       │• Slack   │
                                       └──────────┘
```

### 3.3 Flujo de ejecución paso a paso

**Paso 1 — Inicialización (`new InventoryFacade()`)**
- `InventoryFacade` invoca `InventoryConfig.getInstance()` → se crea la única instancia con `minStockThreshold=10`, `defaultReorderQuantity=50`.
- Se instancia `InMemoryProductRepository` (mapa vacío).
- Se crea `ExternalSupplierAPI("DEFAULT-SUP")` envuelto en `SupplierAdapter("Default Supplier")`.
- Se crea `FixedReorderStrategy` como estrategia por defecto.
- Se instancia `InventoryManager(repository, strategy, supplier)`.
- Se registran `EmailAlert` y `SMSAlert` como observadores.

**Paso 2 — Registro de productos (`registerProduct()`)**
- La fachada construye un `CreateProductParams` y lo pasa a `ProductFactory.create()`.
- La fábrica evalúa la categoría y retorna la subclase correspondiente.
- El producto se persiste vía `InventoryManager.addProduct()` → `repository.save()`.

**Paso 3 — Reporte inicial (`printInventoryReport()`)**
- Itera todos los productos del repositorio, imprime sus datos y marca `!! LOW STOCK !!` si `quantity < threshold`.

**Paso 4 — Agregar observador (`addAlertChannel(new SlackAlert())`)**
- Se registra un nuevo observador en la lista de `InventoryManager.observers`.

**Paso 5 — Monitoreo (`monitorInventory()`)**
- `InventoryManager` itera todos los productos. Para cada uno con `quantity < threshold`:
  1. Notifica a todos los observadores.
  2. Calcula la cantidad a reordenar con la estrategia activa.
  3. Coloca la orden al proveedor activo.
- Retorna un arreglo de `ReorderResult`.

**Paso 6 — Actualización de stock con alertas (`updateProductStock("E001", 3)`)**
- `InventoryManager.updateStock()` actualiza la cantidad en el repositorio.
- Como `3 < 10` (threshold), se disparan:
  1. `notifyObservers()` → Email, SMS y Slack reciben la alerta.
  2. `executeReorder()` → `FixedReorderStrategy` calcula 50 unidades → `SupplierAdapter.placeOrder()` → `ExternalSupplierAPI.submitPurchaseOrder()`.

**Pasos 7-9 — Cambio de estrategia y proveedor en runtime**
- `setReorderStrategy(new DemandBasedReorderStrategy(2.5))` cambia la referencia interna.
- `setReorderStrategy(new SeasonalReorderStrategy())` la cambia nuevamente.
- `setSupplier(new SupplierAdapter(...))` cambia el proveedor activo.
- Cada `updateProductStock()` subsiguiente usa la estrategia y proveedor actuales.

**Paso 10 — Cambio de configuración (`setStockThreshold(15)`, `setReorderQuantity(100)`)**
- Modifica los valores en la instancia Singleton. Todos los módulos que leen de `InventoryConfig.getInstance()` ven los nuevos valores inmediatamente.

**Pasos 11-12 — Monitoreo final y reporte**
- Con el nuevo threshold de 15, más productos caen por debajo del umbral.
- El reporte final muestra el estado actualizado de todo el inventario.

---

## 4. Descripción de Cada Función y Clase

### 4.1 Enum `ProductCategory`

**Archivo**: `src/models/Product.ts:3-8`

```typescript
enum ProductCategory {
  Electronics = "ELECTRONICS",
  Food = "FOOD",
  Clothing = "CLOTHING",
  Perishable = "PERISHABLE",
}
```

**Responsabilidad**: Define las categorías válidas de productos. Usar un enum con valores string (en lugar de numérico) mejora la legibilidad en logs y reportes.

---

### 4.2 Interfaz `ProductProps`

**Archivo**: `src/models/Product.ts:10-16`

```typescript
interface ProductProps {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  quantity: number;
  readonly unitPrice: number;
}
```

**Responsabilidad**: Contrato de construcción para `Product`. Todos los campos son `readonly` excepto `quantity`, que es el único campo mutable del producto.

---

### 4.3 Clase abstracta `Product`

**Archivo**: `src/models/Product.ts:19-40`

```typescript
abstract class Product {
  constructor(props: ProductProps)
  abstract getStorageRequirements(): string
  toString(): string
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `constructor(props)` | Inicializa los campos `id`, `name`, `category`, `quantity`, `unitPrice` | `ProductProps` | — | Ninguno |
| `getStorageRequirements()` | Retorna los requisitos de almacenamiento específicos de la categoría | — | `string` | Ninguno |
| `toString()` | Representación legible del producto | — | `string` con formato `[CATEGORY] Name (xQty) - $Price` | Ninguno |

---

### 4.4 Clase `ElectronicsProduct`

**Archivo**: `src/models/Product.ts:42-50`

```typescript
class ElectronicsProduct extends Product {
  constructor(props: Omit<ProductProps, "category">)
  getStorageRequirements(): string  // → "Dry environment, anti-static packaging required"
}
```

**Responsabilidad**: Producto de electrónica. El constructor inyecta automáticamente `ProductCategory.Electronics`. El `Omit<ProductProps, "category">` evita que el cliente pase la categoría manualmente (la fábrica se encarga).

---

### 4.5 Clase `FoodProduct`

**Archivo**: `src/models/Product.ts:52-60`

```typescript
class FoodProduct extends Product {
  constructor(props: Omit<ProductProps, "category">)
  getStorageRequirements(): string  // → "Temperature-controlled storage, FIFO rotation"
}
```

---

### 4.6 Clase `ClothingProduct`

**Archivo**: `src/models/Product.ts:62-70`

```typescript
class ClothingProduct extends Product {
  constructor(props: Omit<ProductProps, "category">)
  getStorageRequirements(): string  // → "Dry environment, protected from moisture"
}
```

---

### 4.7 Clase `PerishableProduct`

**Archivo**: `src/models/Product.ts:72-80`

```typescript
class PerishableProduct extends Product {
  constructor(props: Omit<ProductProps, "category">)
  getStorageRequirements(): string  // → "Refrigerated storage (2-8°C), strict expiration tracking"
}
```

---

### 4.8 Clase `InventoryConfig` (Singleton)

**Archivo**: `src/config/InventoryConfig.ts:4-51`

```typescript
class InventoryConfig {
  private static instance: InventoryConfig | null
  private constructor()
  static getInstance(): InventoryConfig
  get/set minStockThreshold: number
  get/set defaultReorderQuantity: number
  get systemName: string
}
```

| Método/Propiedad | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `getInstance()` | Retorna la instancia única; la crea si no existe | — | `InventoryConfig` | Crea la instancia en la primera invocación |
| `set minStockThreshold` | Actualiza el umbral mínimo de stock | `number` (≥ 0) | — | Lanza `Error` si el valor es negativo |
| `set defaultReorderQuantity` | Actualiza la cantidad de reorden por defecto | `number` (> 0) | — | Lanza `Error` si el valor es ≤ 0 |
| `get systemName` | Retorna el nombre del sistema | — | `"Intelligent Inventory System"` | Ninguno |

**Valores por defecto**: `minStockThreshold = 10`, `defaultReorderQuantity = 50`.

---

### 4.9 Interfaz `CreateProductParams`

**Archivo**: `src/factory/ProductFactory.ts:13-19`

```typescript
interface CreateProductParams {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly quantity: number;
  readonly unitPrice: number;
}
```

**Responsabilidad**: Contrato de entrada para la fábrica. Todos los campos son `readonly` para prevenir mutación accidental de los parámetros antes de la creación.

---

### 4.10 Clase `ProductFactory`

**Archivo**: `src/factory/ProductFactory.ts:21-41`

```typescript
class ProductFactory {
  static create(params: CreateProductParams): Product
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `create(params)` | Instancia la subclase correcta de `Product` según la categoría | `CreateProductParams` | `Product` (subclase concreta) | Lanza `Error` si la categoría no es reconocida (imposible si el enum no se extiende sin actualizar el switch) |

**Detalle de implementación**: El `default` del `switch` asigna `category` a una variable `_exhaustive: never`. Si se agrega un nuevo valor al enum `ProductCategory` sin agregarlo al `switch`, TypeScript produce un error de compilación porque el nuevo valor no es asignable a `never`.

---

### 4.11 Interfaz `ReorderStrategy`

**Archivo**: `src/strategies/ReorderStrategy.ts:6-11`

```typescript
interface ReorderStrategy {
  readonly name: string;
  calculateReorderQuantity(product: Product, currentStock: number): number;
}
```

**Responsabilidad**: Contrato que define cómo se calcula la cantidad a reordenar. La propiedad `name` identifica la estrategia en los logs.

---

### 4.12 Clase `FixedReorderStrategy`

**Archivo**: `src/strategies/FixedReorderStrategy.ts:7-13`

```typescript
class FixedReorderStrategy implements ReorderStrategy {
  readonly name = "Fixed Reorder"
  calculateReorderQuantity(_product: Product, _currentStock: number): number
}
```

| Método | Responsabilidad | Entrada | Salida |
|---|---|---|---|
| `calculateReorderQuantity()` | Retorna siempre la cantidad fija de reorden del Singleton | Parámetros ignorados | `InventoryConfig.getInstance().defaultReorderQuantity` (por defecto: 50) |

**Lógica**: Ignora completamente el producto y el stock actual. Siempre reordena la cantidad configurada globalmente.

---

### 4.13 Clase `DemandBasedReorderStrategy`

**Archivo**: `src/strategies/DemandBasedReorderStrategy.ts:8-23`

```typescript
class DemandBasedReorderStrategy implements ReorderStrategy {
  readonly name = "Demand-Based Reorder"
  constructor(demandMultiplier: number = 2.0)
  calculateReorderQuantity(_product: Product, currentStock: number): number
}
```

| Método | Responsabilidad | Entrada | Salida |
|---|---|---|---|
| `constructor(demandMultiplier)` | Configura el factor de demanda | `number` (por defecto 2.0) | — |
| `calculateReorderQuantity()` | Calcula `⌈(threshold - currentStock) × demandMultiplier⌉` | `Product` (no usado), `currentStock` | `number` (mínimo 0) |

**Fórmula**: `Math.ceil(Math.max(0, threshold - currentStock) * demandMultiplier)`

**Ejemplo**: Con `threshold=10`, `currentStock=3`, `demandMultiplier=2.5`:
`deficit = max(0, 10-3) = 7` → `ceil(7 × 2.5) = ceil(17.5) = 18` unidades.

---

### 4.14 Clase `SeasonalReorderStrategy`

**Archivo**: `src/strategies/SeasonalReorderStrategy.ts:8-27`

```typescript
class SeasonalReorderStrategy implements ReorderStrategy {
  readonly name = "Seasonal Reorder"
  private readonly seasonalMultipliers: readonly number[]
  calculateReorderQuantity(_product: Product, currentStock: number): number
}
```

| Método | Responsabilidad | Entrada | Salida |
|---|---|---|---|
| `calculateReorderQuantity()` | Escala la cantidad base por un multiplicador mensual | `Product` (no usado), `currentStock` | `number` |

**Multiplicadores mensuales** (índice 0 = enero):

| Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.0 | 1.0 | 1.0 | 1.1 | 1.1 | 1.2 | 1.0 | 1.0 | 1.1 | 1.2 | 1.5 | 2.0 |

**Fórmula**: `Math.ceil(Math.max(baseQuantity, deficit) * seasonalMultiplier[month])`

El multiplicador de diciembre (2.0) refleja el aumento de demanda en temporada navideña.

---

### 4.15 Interfaz `StockObserver`

**Archivo**: `src/observers/StockObserver.ts:6-9`

```typescript
interface StockObserver {
  update(product: Product, currentStock: number, threshold: number): void;
}
```

**Responsabilidad**: Contrato para observadores de eventos de stock bajo. Recibe el producto afectado, su stock actual y el umbral configurado.

---

### 4.16 Clase `EmailAlert`

**Archivo**: `src/observers/EmailAlert.ts:6-14`

```typescript
class EmailAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void
}
```

**Responsabilidad**: Simula el envío de una notificación por email al warehouse manager. Efecto secundario: escribe en `console.log`.

---

### 4.17 Clase `SMSAlert`

**Archivo**: `src/observers/SMSAlert.ts:6-14`

```typescript
class SMSAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void
}
```

**Responsabilidad**: Simula el envío de una notificación por SMS al equipo de operaciones. Efecto secundario: escribe en `console.log`.

---

### 4.18 Clase `SlackAlert` (inline en main.ts)

**Archivo**: `src/main.ts:13-20`

```typescript
class SlackAlert implements StockObserver {
  update(product: Product, currentStock: number, threshold: number): void
}
```

**Responsabilidad**: Simula el envío de una alerta a un canal de Slack `#inventory-alerts`. Definida inline en `main.ts` para demostrar que agregar un nuevo canal de notificación no requiere modificar ninguna clase existente del sistema.

---

### 4.19 Interfaz `ProductRepository`

**Archivo**: `src/repositories/ProductRepository.ts:6-12`

```typescript
interface ProductRepository {
  save(product: Product): void;
  findById(id: string): Product | undefined;
  findAll(): Product[];
  delete(id: string): boolean;
  update(product: Product): void;
}
```

**Responsabilidad**: Contrato CRUD para persistencia de productos. Desacopla la lógica de dominio del mecanismo de almacenamiento.

---

### 4.20 Clase `InMemoryProductRepository`

**Archivo**: `src/repositories/InMemoryProductRepository.ts:7-35`

```typescript
class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product>
  save(product: Product): void
  findById(id: string): Product | undefined
  findAll(): Product[]
  delete(id: string): boolean
  update(product: Product): void
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `save(product)` | Almacena un producto nuevo | `Product` | — | Lanza `Error` si el ID ya existe |
| `findById(id)` | Busca un producto por ID | `string` | `Product \| undefined` | Ninguno |
| `findAll()` | Lista todos los productos | — | `Product[]` | Ninguno |
| `delete(id)` | Elimina un producto por ID | `string` | `boolean` (`true` si existía) | Remueve del Map |
| `update(product)` | Actualiza un producto existente | `Product` | — | Lanza `Error` si el ID no existe |

---

### 4.21 Interfaz `SupplierOrder`

**Archivo**: `src/adapters/Supplier.ts:5-10`

```typescript
interface SupplierOrder {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly supplierName: string;
}
```

**Responsabilidad**: Representa una orden de reabastecimiento confirmada.

---

### 4.22 Interfaz `Supplier`

**Archivo**: `src/adapters/Supplier.ts:12-24`

```typescript
interface Supplier {
  readonly name: string;
  placeOrder(productId: string, productName: string, quantity: number): SupplierOrder;
  isAvailable(productId: string): boolean;
}
```

**Responsabilidad**: Contrato interno para proveedores. Cualquier proveedor (local, externo, mock) debe implementar esta interfaz.

---

### 4.23 Interfaz `ExternalOrderResponse`

**Archivo**: `src/adapters/ExternalSupplierAPI.ts:4-9`

```typescript
interface ExternalOrderResponse {
  readonly order_id: string;
  readonly item_code: string;
  readonly qty_confirmed: number;
  readonly status: "ACCEPTED" | "REJECTED";
}
```

**Responsabilidad**: Formato de respuesta de la API externa del proveedor. Usa `snake_case` (convención del tercero), a diferencia del `camelCase` del sistema interno.

---

### 4.24 Clase `ExternalSupplierAPI`

**Archivo**: `src/adapters/ExternalSupplierAPI.ts:11-49`

```typescript
class ExternalSupplierAPI {
  constructor(supplierCode: string)
  submitPurchaseOrder(itemCode: string, requestedQty: number): ExternalOrderResponse
  checkItemAvailability(itemCode: string): boolean
  getSupplierCode(): string
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `submitPurchaseOrder()` | Simula enviar una orden de compra al proveedor | `itemCode`, `requestedQty` | `ExternalOrderResponse` (siempre ACCEPTED) | `console.log` |
| `checkItemAvailability()` | Simula verificar disponibilidad | `itemCode` | `boolean` (siempre `true`) | `console.log` |
| `getSupplierCode()` | Retorna el código del proveedor | — | `string` | Ninguno |

**Nota**: Esta clase simula una API de terceros que **no** se puede modificar. Sus métodos tienen nombres y firmas diferentes al contrato `Supplier` del sistema.

---

### 4.25 Clase `SupplierAdapter`

**Archivo**: `src/adapters/SupplierAdapter.ts:7-41`

```typescript
class SupplierAdapter implements Supplier {
  constructor(externalApi: ExternalSupplierAPI, name: string)
  placeOrder(productId: string, productName: string, quantity: number): SupplierOrder
  isAvailable(productId: string): boolean
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `placeOrder()` | Traduce la llamada interna a `submitPurchaseOrder()` de la API externa | `productId`, `productName`, `quantity` | `SupplierOrder` | Lanza `Error` si el status es `"REJECTED"` |
| `isAvailable()` | Traduce a `checkItemAvailability()` | `productId` | `boolean` | Ninguno |

---

### 4.26 Interfaz `ReorderResult`

**Archivo**: `src/core/InventoryManager.ts:11-16`

```typescript
interface ReorderResult {
  readonly product: Product;
  readonly quantityOrdered: number;
  readonly order: SupplierOrder;
  readonly strategyUsed: string;
}
```

**Responsabilidad**: Resultado estructurado de una operación de reorden. Incluye qué producto, cuánto se ordenó, los detalles de la orden del proveedor, y qué estrategia se usó.

---

### 4.27 Clase `InventoryManager`

**Archivo**: `src/core/InventoryManager.ts:18-160`

```typescript
class InventoryManager {
  constructor(repository: ProductRepository, reorderStrategy: ReorderStrategy, supplier: Supplier)
  addObserver(observer: StockObserver): void
  removeObserver(observer: StockObserver): void
  private notifyObservers(product: Product, currentStock: number): void
  setReorderStrategy(strategy: ReorderStrategy): void
  setSupplier(supplier: Supplier): void
  addProduct(product: Product): void
  getProduct(id: string): Product | undefined
  getAllProducts(): Product[]
  updateStock(productId: string, newQuantity: number): ReorderResult | null
  monitorInventory(): ReorderResult[]
  private executeReorder(product: Product, currentStock: number): ReorderResult | null
}
```

| Método | Responsabilidad | Entrada | Salida | Efectos secundarios |
|---|---|---|---|---|
| `addObserver(observer)` | Registra un observador de stock | `StockObserver` | — | Agrega al arreglo `observers` |
| `removeObserver(observer)` | Remueve un observador | `StockObserver` | — | Remueve del arreglo por referencia |
| `notifyObservers(product, currentStock)` | Itera y notifica todos los observadores | `Product`, `number` | — | Invoca `update()` en cada observador |
| `setReorderStrategy(strategy)` | Cambia la estrategia de reorden | `ReorderStrategy` | — | `console.log` |
| `setSupplier(supplier)` | Cambia el proveedor activo | `Supplier` | — | `console.log` |
| `addProduct(product)` | Registra un producto en el repositorio | `Product` | — | `console.log`, `repository.save()` |
| `getProduct(id)` | Busca un producto por ID | `string` | `Product \| undefined` | Ninguno |
| `getAllProducts()` | Lista todos los productos | — | `Product[]` | Ninguno |
| `updateStock(productId, newQuantity)` | Actualiza el stock; si cae bajo el umbral, notifica y reordena | `string`, `number` | `ReorderResult \| null` | Modifica `product.quantity`, puede disparar notificaciones y reorden |
| `monitorInventory()` | Escanea todo el inventario buscando productos bajo el umbral | — | `ReorderResult[]` | Puede disparar múltiples notificaciones y reórdenes |
| `executeReorder(product, currentStock)` | (Privado) Calcula cantidad con la estrategia y coloca orden al proveedor | `Product`, `number` | `ReorderResult \| null` | `console.log`, llamada al proveedor |

---

### 4.28 Clase `InventoryFacade`

**Archivo**: `src/facade/InventoryFacade.ts:19-145`

```typescript
class InventoryFacade {
  constructor(supplier?: Supplier, strategy?: ReorderStrategy)
  registerProduct(id: string, name: string, category: ProductCategory, quantity: number, unitPrice: number): Product
  updateProductStock(productId: string, newQuantity: number): ReorderResult | null
  monitorInventory(): ReorderResult[]
  setStockThreshold(threshold: number): void
  setReorderQuantity(quantity: number): void
  setReorderStrategy(strategy: ReorderStrategy): void
  setSupplier(supplier: Supplier): void
  addAlertChannel(observer: StockObserver): void
  getProduct(id: string): Product | undefined
  listAllProducts(): Product[]
  printInventoryReport(): void
}
```

| Método | Responsabilidad | Delega a |
|---|---|---|
| `registerProduct()` | Crea producto vía Factory y lo registra | `ProductFactory.create()` → `manager.addProduct()` |
| `updateProductStock()` | Actualiza stock con posibles alertas | `manager.updateStock()` |
| `monitorInventory()` | Escaneo completo del inventario | `manager.monitorInventory()` |
| `setStockThreshold()` | Modifica el umbral en el Singleton | `config.minStockThreshold = value` |
| `setReorderQuantity()` | Modifica la cantidad de reorden en el Singleton | `config.defaultReorderQuantity = value` |
| `setReorderStrategy()` | Cambia la estrategia de reorden | `manager.setReorderStrategy()` |
| `setSupplier()` | Cambia el proveedor activo | `manager.setSupplier()` |
| `addAlertChannel()` | Agrega un nuevo observador | `manager.addObserver()` |
| `getProduct()` | Consulta un producto | `manager.getProduct()` |
| `listAllProducts()` | Lista todos los productos | `manager.getAllProducts()` |
| `printInventoryReport()` | Imprime reporte formateado | Lee de `manager.getAllProducts()` y `config` |

---

### 4.29 Función `main()`

**Archivo**: `src/main.ts:22-124`

```typescript
function main(): void
```

**Responsabilidad**: Orquesta una demostración de 12 pasos que ejercita todos los patrones del sistema. No recibe parámetros ni retorna valores. Es invocada en la línea 124.

---

## 5. Puntos Críticos del Diseño

### 5.1 Chequeo exhaustivo con `never` en la fábrica

En `ProductFactory.create()` (línea 36), el caso `default` del switch asigna la categoría a una variable de tipo `never`:

```typescript
default: {
  const _exhaustive: never = category;
  throw new Error(`Unknown product category: ${_exhaustive}`);
}
```

Esto convierte un error de ejecución en un **error de compilación**. Si se agrega `ProductCategory.Fragile` al enum sin actualizar el switch, TypeScript reportará: `Type 'ProductCategory.Fragile' is not assignable to type 'never'`. Esta es una técnica esencial para garantizar que la fábrica siempre esté sincronizada con el enum.

### 5.2 Mutabilidad controlada en `Product`

Todos los campos de `Product` son `readonly` excepto `quantity`. Esto es intencional: el ID, nombre, categoría y precio de un producto no deberían cambiar después de la creación, pero la cantidad sí fluctúa. Los constructores de las subclases aceptan `Omit<ProductProps, "category">` para que la categoría sea fijada internamente, no por el cliente.

### 5.3 El Singleton como punto de acoplamiento aceptado

`InventoryConfig` es accedido directamente vía `getInstance()` por las estrategias de reorden y por `InventoryManager`. Esto introduce un acoplamiento estático. Sin embargo, este trade-off es aceptable porque:
- La configuración es, por definición, global al sistema.
- Sin Singleton, habría que inyectar la configuración como parámetro en cada estrategia y en el manager, lo que complicaría las firmas sin beneficio funcional real.
- El `set` con validación (`threshold >= 0`, `quantity > 0`) protege contra configuraciones inválidas.

### 5.4 `updateStock` combina escritura + lectura + efectos

`InventoryManager.updateStock()` hace tres cosas en una operación atómica: actualiza el repositorio, notifica observadores si el stock es bajo, y ejecuta reorden. Este diseño fue elegido sobre separar estas operaciones porque garantiza que **nunca se omita una alerta o reorden** cuando el stock cae. La alternativa (separar en `updateStock()` + `checkAndNotify()` + `checkAndReorder()`) pondría la responsabilidad de llamar los tres métodos en el cliente, con riesgo de olvido.

### 5.5 Observadores por referencia (identidad, no igualdad)

`removeObserver()` usa `indexOf()` para buscar el observador exacto (por referencia). Esto significa que si se crean dos instancias de `EmailAlert`, son observadores distintos. Esto es correcto: dos instancias de `EmailAlert` podrían estar configuradas para enviar a destinatarios diferentes (aunque en esta implementación no hay configuración).

### 5.6 La estrategia estacional depende de `Date.now()`

`SeasonalReorderStrategy` llama `new Date().getMonth()` internamente. Esto la hace dependiente de la fecha del sistema. En producción, esto podría dificultar el testing. Sin embargo, para este contexto educativo, es aceptable. La alternativa sería inyectar la fecha como parámetro, pero complicaría la interfaz `ReorderStrategy` solo para una implementación.

### 5.7 El Adapter valida respuestas del proveedor externo

`SupplierAdapter.placeOrder()` verifica que `response.status === "ACCEPTED"` y lanza una excepción si es `"REJECTED"`. Esta validación ocurre en el adaptador (no en `InventoryManager`) porque es responsabilidad del adaptador garantizar que la traducción fue exitosa. El manager confía en que `Supplier.placeOrder()` funciona correctamente o lanza excepción.

### 5.8 Constructor de la Facade con parámetros opcionales

```typescript
constructor(supplier?: Supplier, strategy?: ReorderStrategy)
```

Permite la inyección de dependencias para testing o configuración avanzada, mientras mantiene un setup sencillo con `new InventoryFacade()` para el caso común. Este es un equilibrio entre flexibilidad y simplicidad.

---

## 6. Dependencias y Configuración

### 6.1 Dependencias de desarrollo (`devDependencies`)

| Paquete | Versión | Rol |
|---|---|---|
| `typescript` | `^5.9.3` | Compilador de TypeScript. Transpila los archivos `.ts` a JavaScript en el directorio `dist/`. |
| `ts-node` | `^10.9.2` | Ejecuta archivos TypeScript directamente sin compilación previa. Usado por `npm start` para ejecutar `src/main.ts`. |
| `@types/node` | `^25.3.5` | Definiciones de tipos para la API de Node.js (`console`, `Date`, `Map`, etc.). |

**No hay dependencias de producción** (`dependencies`). El proyecto es 100% TypeScript estándar sin librerías externas de runtime.

### 6.2 Configuración de TypeScript (`tsconfig.json`)

| Opción | Valor | Propósito |
|---|---|---|
| `strict` | `true` | Habilita todas las verificaciones estrictas de tipos |
| `noUncheckedIndexedAccess` | `true` | Accesos a índices devuelven `T \| undefined`, forzando verificaciones |
| `exactOptionalPropertyTypes` | `true` | Distingue entre `undefined` explícito y propiedad omitida |
| `target` | `es2022` | Genera JavaScript ES2022 compatible |
| `module` | `commonjs` | Usa `require()`/`module.exports` para compatibilidad con Node.js |
| `declaration` + `declarationMap` | `true` | Genera archivos `.d.ts` y mapas de declaración |
| `sourceMap` | `true` | Genera `.js.map` para depuración |

### 6.3 Instalación y ejecución

```bash
# Clonar e instalar dependencias
cd intelligent-inventory
npm install

# Ejecutar directamente con ts-node
npm start

# Compilar a JavaScript y ejecutar el compilado
npm run build
npm run run:compiled
```

---

## 7. Ejemplo de Uso

### 7.1 Ejecución del demo completo

```bash
$ npm start
```

### 7.2 Salida esperada (fragmento representativo)

```
============================================
   INTELLIGENT INVENTORY SYSTEM - DEMO
============================================

--- Step 1: System Initialization (Facade + Singleton) ---
[FACADE] Intelligent Inventory System initialized
[FACADE] Min stock threshold: 10

--- Step 2: Register Products (Factory Method) ---
[INVENTORY] Product registered: [ELECTRONICS] Laptop HP ProBook (x25) - $899.99
[INVENTORY] Product registered: [FOOD] Organic Milk 1L (x8) - $3.5
[INVENTORY] Product registered: [CLOTHING] Winter Jacket (x15) - $120
[INVENTORY] Product registered: [PERISHABLE] Fresh Salmon 500g (x5) - $12.99
[INVENTORY] Product registered: [ELECTRONICS] USB-C Cable (x50) - $9.99

--- Step 3: Initial Inventory Report ---

========== INVENTORY REPORT ==========
Total products: 5
Stock threshold: 10

  [ELECTRONICS] Laptop HP ProBook (x25) - $899.99 | Storage: Dry environment, anti-static packaging required | Status: OK
  [FOOD] Organic Milk 1L (x8) - $3.5 | Storage: Temperature-controlled storage, FIFO rotation | Status: !! LOW STOCK !!
  [CLOTHING] Winter Jacket (x15) - $120 | Storage: Dry environment, protected from moisture | Status: OK
  [PERISHABLE] Fresh Salmon 500g (x5) - $12.99 | Storage: Refrigerated storage (2-8°C), strict expiration tracking | Status: !! LOW STOCK !!
  [ELECTRONICS] USB-C Cable (x50) - $9.99 | Storage: Dry environment, anti-static packaging required | Status: OK
=======================================

--- Step 5: Automatic Monitoring (Observer + Strategy) ---

=== INVENTORY MONITORING SCAN ===
[MONITOR] "Organic Milk 1L" stock: 8 (threshold: 10)
[EMAIL ALERT] Product "Organic Milk 1L" (ID: F001) stock is 8, below threshold of 10. Sending email notification to warehouse manager.
[SMS ALERT] Product "Organic Milk 1L" (ID: F001) stock is 8, below threshold of 10. Sending SMS to operations team.
[SLACK ALERT] #inventory-alerts: "Organic Milk 1L" has 8 units (threshold: 10)
[REORDER] Strategy "Fixed Reorder" recommends ordering 50 units of "Organic Milk 1L"
[EXTERNAL API - DEFAULT-SUP] Submitting PO for item "F001", qty: 50
[REORDER] Order confirmed from "Default Supplier": 50 units of "Organic Milk 1L"
...
=== SCAN COMPLETE: 2 reorder(s) placed ===

--- Step 6: Stock Update with Alert Trigger ---
[INVENTORY] LOW STOCK detected for "Laptop HP ProBook" (3/10)
[EMAIL ALERT] Product "Laptop HP ProBook" (ID: E001) stock is 3, below threshold of 10. Sending email notification to warehouse manager.
[SMS ALERT] Product "Laptop HP ProBook" (ID: E001) stock is 3, below threshold of 10. Sending SMS to operations team.
[SLACK ALERT] #inventory-alerts: "Laptop HP ProBook" has 3 units (threshold: 10)
[REORDER] Strategy "Fixed Reorder" recommends ordering 50 units of "Laptop HP ProBook"
[EXTERNAL API - DEFAULT-SUP] Submitting PO for item "E001", qty: 50
[REORDER] Order confirmed from "Default Supplier": 50 units of "Laptop HP ProBook"

--- Step 7: Change Reorder Strategy (Strategy Pattern) ---
[INVENTORY] Reorder strategy changed to: Demand-Based Reorder
[INVENTORY] LOW STOCK detected for "Winter Jacket" (4/10)
[REORDER] Strategy "Demand-Based Reorder" recommends ordering 15 units of "Winter Jacket"

--- Step 9: Change Supplier (Adapter Pattern) ---
[INVENTORY] Supplier changed to: Premium Global Supplies
[INVENTORY] LOW STOCK detected for "Organic Milk 1L" (2/10)
[EXTERNAL API - PREMIUM-SUP] Submitting PO for item "F001", qty: ...
[REORDER] Order confirmed from "Premium Global Supplies": ... units of "Organic Milk 1L"

--- Step 10: Runtime Configuration Change (Singleton) ---
[FACADE] Stock threshold updated to: 15
[FACADE] Default reorder quantity updated to: 100

============================================
   DEMO COMPLETE
============================================
```

### 7.3 Uso programático (fuera del demo)

```typescript
import { InventoryFacade } from "./facade/InventoryFacade";
import { ProductCategory } from "./models/Product";
import { DemandBasedReorderStrategy } from "./strategies/DemandBasedReorderStrategy";

// Crear sistema con valores por defecto
const inventory = new InventoryFacade();

// Registrar un producto
const laptop = inventory.registerProduct(
  "E001", "Laptop HP", ProductCategory.Electronics, 25, 899.99
);

// Cambiar estrategia a demanda
inventory.setReorderStrategy(new DemandBasedReorderStrategy(3.0));

// Actualizar stock (dispara alerta + reorden si baja del umbral)
const result = inventory.updateProductStock("E001", 3);
if (result) {
  console.log(`Reordenadas ${result.quantityOrdered} unidades con estrategia "${result.strategyUsed}"`);
  // → Reordenadas 21 unidades con estrategia "Demand-Based Reorder"
}

// Monitorear todo el inventario
const reorders = inventory.monitorInventory();
console.log(`Se colocaron ${reorders.length} órdenes de reabastecimiento`);
```
