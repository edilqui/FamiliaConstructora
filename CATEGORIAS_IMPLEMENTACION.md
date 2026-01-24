# 🏷️ Sistema de Categorías - FamiliaBuilder

## 📋 Resumen

Se ha implementado un sistema de categorías para clasificar los gastos registrados en la aplicación. Las categorías permiten un mejor control y seguimiento de en qué se está gastando el dinero de cada proyecto.

---

## ✅ Categorías por Defecto

Al inicializar el sistema, se crean automáticamente las siguientes 9 categorías:

1. **Materiales**
2. **Jornales**
3. **Enseres**
4. **Pagos Extra**
5. **Cemento**
6. **Varilla**
7. **Arena**
8. **Electricidad**
9. **Aguas Limpias**

---

## 🔄 Cambios Implementados

### 1. Nuevo Tipo: `Category`

**Archivo:** `src/types/index.ts`

```typescript
export interface Category {
  id: string;
  name: string;
  order: number; // Para ordenar las categorías
}
```

### 2. Actualización del Tipo `Transaction`

Se agregaron dos campos nuevos:

```typescript
export interface Transaction {
  // ... campos existentes
  categoryId: string | null; // null para aportes
  categoryName: string; // Nombre de la categoría
}
```

---

## 📁 Estructura de Firestore

### Nueva Colección: `categories`

```
categories/
├── {categoryId1}
│   ├── name: "Materiales"
│   └── order: 1
├── {categoryId2}
│   ├── name: "Jornales"
│   └── order: 2
└── ...
```

**Creación:** Automática cuando se inicializan los proyectos

---

## 🛠️ Archivos Modificados

### 1. `src/services/initializeData.ts`

**Agregado:**
- Constante `initialCategories` con las 9 categorías
- Función `initializeCategories()` para crear las categorías
- Las categorías se crean automáticamente al inicializar proyectos

### 2. `src/services/transactionService.ts`

**Actualizado:**
- Parámetros `categoryId` y `categoryName` agregados
- Se guardan en Firestore al crear transacciones

### 3. `src/features/TransactionForm.tsx`

**Agregado:**
- State `categoryId` para almacenar la categoría seleccionada
- Selector dropdown con todas las categorías disponibles
- Validación: la categoría es **obligatoria** para gastos
- Se obtienen las categorías desde `useDashboardData()`

**Orden de campos en el formulario:**
1. Saldo disponible (info)
2. **Proyecto** (selector)
3. **Categoría** (selector) ← NUEVO
4. Monto (input numérico)
5. Descripción (textarea)

### 4. `src/features/ContributionForm.tsx`

**Actualizado:**
- Los aportes tienen `categoryId: null` y `categoryName: 'N/A'`
- No se muestra selector de categoría (solo aplica a gastos)

### 5. `src/hooks/useDashboardData.ts`

**Agregado:**
- State `categories` para almacenar las categorías
- Suscripción en tiempo real a la colección `categories`
- Ordenadas por el campo `order` (ascendente)
- Devueltas en el objeto de retorno

### 6. `src/features/Statistics.tsx`

**Actualizado:**
- Nueva columna "Categoría" en la tabla de transacciones
- Muestra la categoría solo para gastos (badge morado)
- Los aportes muestran "-" en la columna de categoría

---

## 🎨 Interfaz de Usuario

### Formulario de Gastos

```
┌─────────────────────────────────────┐
│ 🔴 Registrar Gasto                  │
├─────────────────────────────────────┤
│ 💰 Disponible en caja: $1,500.00    │
│                                     │
│ Proyecto:                           │
│ [▼ Construcción de Apartamentos]    │
│                                     │
│ Categoría del Gasto: ⭐             │
│ [▼ Cemento                    ]     │
│                                     │
│ Monto del Gasto:                    │
│ $ [_________________]               │
│                                     │
│ Descripción del Gasto:              │
│ [________________________]          │
│ [________________________]          │
│                                     │
│ [Cancelar]    [Registrar Gasto]    │
└─────────────────────────────────────┘
```

### Tabla de Estadísticas

```
┌────────────────────────────────────────────────────┐
│ Últimas Transacciones                              │
├──────┬──────┬───────────┬──────────────┬──────────┤
│ Fecha│ Tipo │ Categoría │ Descripción  │ Monto    │
├──────┼──────┼───────────┼──────────────┼──────────┤
│ 21/01│Gasto │ Cemento   │ 20 bultos    │-$150.00  │
│ 20/01│Aporte│    -      │ Aporte mes   │+$500.00  │
│ 19/01│Gasto │ Jornales  │ Pago maestro │-$200.00  │
└──────┴──────┴───────────┴──────────────┴──────────┘
```

---

## ✅ Validaciones

1. ✅ **Categoría Obligatoria**: No se puede crear un gasto sin seleccionar una categoría
2. ✅ **Solo para Gastos**: Las categorías solo se aplican a gastos, no a aportes
3. ✅ **Ordenamiento**: Las categorías se muestran en orden según el campo `order`

---

## 🚀 Flujo de Uso

### Registrar un Gasto con Categoría

1. Click en FAB rojo (botón "-")
2. Seleccionar **Proyecto** (ej: "Construcción de Apartamentos")
3. Seleccionar **Categoría** (ej: "Cemento") ← NUEVO PASO
4. Ingresar **Monto** (ej: 150)
5. Ingresar **Descripción** (ej: "20 bultos de cemento")
6. Click en "Registrar Gasto"

**Resultado:**
- ✅ Se guarda con `categoryId` y `categoryName`
- ✅ Aparece en estadísticas con la categoría visible
- ✅ Se puede filtrar/analizar por categoría en el futuro

---

## 📊 Datos en Firestore

### Ejemplo de Transacción con Categoría

```javascript
{
  id: "trans123",
  amount: 150,
  project: "Construcción de Apartamentos",
  type: "expense",
  projectId: "proj456",
  categoryId: "cat789",           // ← NUEVO
  categoryName: "Cemento",         // ← NUEVO
  userId: "user001",
  registeredBy: "user001",
  description: "20 bultos de cemento",
  date: Timestamp,
  createdAt: Timestamp
}
```

### Ejemplo de Aporte (sin categoría)

```javascript
{
  id: "trans124",
  amount: 500,
  project: "Aporte",
  type: "contribution",
  projectId: null,
  categoryId: null,                // ← null para aportes
  categoryName: "N/A",             // ← N/A para aportes
  userId: "user001",
  registeredBy: "user001",
  description: "Aporte mensual",
  date: Timestamp,
  createdAt: Timestamp
}
```

---

## 🎯 Beneficios

1. ✅ **Mejor Control**: Saber exactamente en qué se gasta el dinero
2. ✅ **Análisis Detallado**: Poder ver cuánto se ha gastado por categoría
3. ✅ **Reportes**: Generar reportes por tipo de gasto
4. ✅ **Trazabilidad**: Histórico claro de compras por categoría
5. ✅ **Planificación**: Identificar las categorías que más dinero consumen

---

## 🔜 Mejoras Futuras Sugeridas

1. 🔜 Agregar estadísticas por categoría en el Dashboard
2. 🔜 Gráfico de pastel mostrando distribución por categoría
3. 🔜 Filtros en la página de estadísticas por categoría
4. 🔜 Permitir crear/editar/eliminar categorías desde la app
5. 🔜 Categorías específicas por proyecto
6. 🔜 Presupuesto por categoría
7. 🔜 Alertas cuando una categoría excede cierto monto

---

## 🎉 Listo para Usar

El sistema de categorías está 100% funcional. Al crear los proyectos iniciales, las 9 categorías se crean automáticamente.

**Para empezar:**
1. Inicializa los proyectos (botón en Dashboard)
2. Las categorías se crean automáticamente
3. Al registrar un gasto, selecciona la categoría apropiada
4. Revisa las estadísticas para ver los gastos por categoría

¡Todo está listo! 🚀
