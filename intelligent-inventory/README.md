# Sistema de Inventario Inteligente

## Descripción

Sistema empresarial de gestión de inventario desarrollado en TypeScript que automatiza el control de stock, la generación de alertas y la reposición de productos mediante la integración con múltiples proveedores. El proyecto aplica **7 patrones de diseño** (creacionales, estructurales y de comportamiento) trabajando en conjunto para lograr una arquitectura desacoplada, extensible y mantenible.

## Estructura del Proyecto

```
src/
├── config/
│   └── InventoryConfig.ts          # Singleton - Configuración centralizada
├── models/
│   └── Product.ts                   # Modelos de dominio (Product, categorías)
├── factory/
│   └── ProductFactory.ts            # Factory Method - Creación de productos
├── observers/
│   ├── StockObserver.ts             # Interfaz Observer
│   ├── EmailAlert.ts                # Observer concreto - Email
│   └── SMSAlert.ts                  # Observer concreto - SMS
├── strategies/
│   ├── ReorderStrategy.ts           # Interfaz Strategy
│   ├── FixedReorderStrategy.ts      # Estrategia fija
│   ├── DemandBasedReorderStrategy.ts # Estrategia basada en demanda
│   └── SeasonalReorderStrategy.ts   # Estrategia estacional
├── adapters/
│   ├── Supplier.ts                  # Interfaz del adaptador
│   ├── ExternalSupplierAPI.ts       # API externa (tercero)
│   └── SupplierAdapter.ts           # Adapter - Envuelve la API externa
├── repositories/
│   ├── ProductRepository.ts         # Interfaz Repository
│   └── InMemoryProductRepository.ts # Implementación en memoria
├── core/
│   └── InventoryManager.ts          # Núcleo del sistema (Subject del Observer)
├── facade/
│   └── InventoryFacade.ts           # Facade - Interfaz simplificada
└── main.ts                          # Punto de entrada y demostración
```

## Patrones de Diseño Implementados

### 1. Singleton (`InventoryConfig`)

Garantiza una única instancia de configuración global compartida por todos los módulos. Parámetros como el umbral mínimo de stock (10 unidades) y la cantidad de reorden se gestionan desde un punto centralizado, permitiendo ajustes en tiempo real sin inconsistencias.

### 2. Factory Method (`ProductFactory`)

Centraliza la creación de productos según su categoría (Electrónica, Alimentos, Ropa, Perecederos). Encapsula la lógica de instanciación, permitiendo agregar nuevas categorías sin modificar el código cliente.

### 3. Observer (`StockObserver`, `EmailAlert`, `SMSAlert`)

Desacopla el monitoreo de stock de los mecanismos de alerta. Cuando un producto cae por debajo del umbral, el `InventoryManager` notifica automáticamente a todos los canales registrados (email, SMS, Slack, etc.) sin alterar el núcleo del sistema.

### 4. Strategy (`ReorderStrategy` y sus implementaciones)

Encapsula diferentes algoritmos de reposición:

- **FixedReorderStrategy**: Cantidad fija configurable.
- **DemandBasedReorderStrategy**: Basada en el déficit multiplicado por un factor de demanda.
- **SeasonalReorderStrategy**: Ajusta cantidades según el mes (mayor demanda en diciembre).

El sistema puede cambiar de estrategia en tiempo de ejecución según el contexto.

### 5. Adapter (`SupplierAdapter`)

Envuelve APIs externas de proveedores (`ExternalSupplierAPI`) que tienen interfaces incompatibles, proporcionando una interfaz uniforme (`Supplier`). Permite integrar o cambiar proveedores sin afectar la lógica central.

### 6. Repository (`ProductRepository`, `InMemoryProductRepository`)

Abstrae el acceso a datos con una interfaz consistente para operaciones CRUD. La implementación actual es en memoria, pero puede migrarse a bases de datos relacionales sin modificar el dominio.

### 7. Facade (`InventoryFacade`)

Ofrece un punto de entrada único y simplificado que unifica todas las capacidades del sistema: registro de productos, monitoreo, alertas, reórdenes y configuración. Oculta la complejidad de las interacciones entre los demás patrones.

## Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar directamente con ts-node
npm start

# O compilar y ejecutar
npm run build
npm run run:compiled
```

## Preguntas de Reflexión

### 1. ¿Cómo integrar nuevos proveedores sin modificar el sistema?

Gracias al patrón **Adapter**, integrar un nuevo proveedor solo requiere crear una nueva clase que implemente la interfaz `Supplier`, envolviendo la API específica del proveedor. El resto del sistema (`InventoryManager`, `InventoryFacade`) trabaja exclusivamente con la interfaz `Supplier`, por lo que no necesita ninguna modificación. Esto cumple con el **Principio Abierto/Cerrado (OCP)**: el sistema está abierto a extensión pero cerrado a modificación.

### 2. ¿Por qué separar la estrategia de reposición?

Porque los criterios de reposición varían según el contexto: un producto estacional necesita mayor stock en diciembre, mientras que uno de demanda constante puede usar una cantidad fija. El patrón **Strategy** permite encapsular cada algoritmo de forma independiente y cambiarlos en tiempo de ejecución sin alterar la lógica del `InventoryManager`. Además, agregar una nueva estrategia (por ejemplo basada en machine learning) solo requiere implementar la interfaz `ReorderStrategy`.

### 3. ¿Qué ocurre si no se usa Observer?

Sin el patrón **Observer**, la lógica de alertas estaría acoplada directamente al `InventoryManager`. Cada vez que se quisiera agregar un nuevo canal de notificación (Slack, panel web, webhook), habría que modificar el código del manager. Esto viola el principio de responsabilidad única (SRP) y el principio abierto/cerrado (OCP), haciendo el sistema frágil y difícil de mantener. El Observer permite agregar o quitar canales de alerta dinámicamente sin tocar el núcleo.

### 4. ¿Cómo reducir complejidad en el módulo principal?

Utilizando el patrón **Facade**, que expone operaciones de alto nivel como `registerProduct()`, `monitorInventory()` y `updateProductStock()`. Internamente, la fachada coordina la fábrica de productos, el repositorio, el manager, los observadores, las estrategias y los adaptadores. El módulo principal (o cualquier cliente) solo interactúa con la fachada, reduciendo drásticamente el acoplamiento y la complejidad.

### 5. ¿Qué patrón ayuda a ocultar subsistemas?

El patrón **Facade**. Su propósito es proporcionar una interfaz simplificada a un conjunto complejo de subsistemas. En este proyecto, `InventoryFacade` unifica el acceso a la configuración (Singleton), creación de productos (Factory), persistencia (Repository), monitoreo y alertas (Observer), estrategias de reorden (Strategy) y comunicación con proveedores (Adapter), presentando al cliente una API limpia e intuitiva.
