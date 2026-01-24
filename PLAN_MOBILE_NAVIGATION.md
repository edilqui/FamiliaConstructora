# 📱 Plan de Migración a Mobile Navigation - FamiliaBuilder

## 🎯 Objetivo
Convertir la aplicación en una PWA mobile-first con navegación bottom toolbar y nuevas funcionalidades.

---

## 📋 Fases de Implementación

### ✅ FASE 1: Bottom Navigation Bar
**Objetivo:** Reemplazar tabs superiores por toolbar bottom con iconos

**Cambios:**
- Crear componente `BottomNav.tsx`
- Modificar `Layout.tsx` para incluir bottom nav
- Rutas actuales (Dashboard, Estadísticas) con nuevos iconos
- Diseño mobile-first con iconos grandes y labels
- Sticky bottom position

**Elementos:**
- 🏠 Dashboard
- 📊 Estadísticas
- (Los demás botones se agregarán en fases siguientes)

**Testing:**
- ✅ Navegación funciona correctamente
- ✅ Indicador visual de página activa
- ✅ Responsive en mobile y desktop
- ✅ Iconos visibles y claros

**Archivos a modificar:**
- `src/components/BottomNav.tsx` (nuevo)
- `src/components/Layout.tsx`
- `src/App.tsx` (rutas)

---

### ✅ FASE 2: Página de Gastos/Historial
**Objetivo:** Nueva página para ver historial completo de gastos y aportes

**Cambios:**
- Crear página `Expenses.tsx`
- Mostrar lista completa de transacciones (paginada)
- Filtros por: Tipo (Gasto/Aporte), Proyecto, Categoría, Fecha
- FAB para "Agregar Gasto" (rojo)
- FAB para "Agregar Entrada/Aporte" (verde)
- Agregar icono en BottomNav: 💰 Gastos

**Características:**
- Lista ordenada por fecha (más reciente primero)
- Cards expandibles con detalles
- Búsqueda por descripción
- Total de gastos vs aportes visible

**Testing:**
- ✅ Lista muestra todas las transacciones
- ✅ Filtros funcionan correctamente
- ✅ FABs abren los formularios correctos
- ✅ Navegación desde bottom nav funciona

**Archivos a crear:**
- `src/features/Expenses.tsx` (nuevo)
- Actualizar `src/components/BottomNav.tsx`
- Actualizar `src/App.tsx` (ruta `/expenses`)

---

### ✅ FASE 3: Página de Balance
**Objetivo:** Vista detallada de balances individuales y estado financiero

**Cambios:**
- Crear página `Balance.tsx`
- Mostrar balance del usuario actual (destacado)
- Tabla/cards de balances de todos los hermanos
- Gráfico de distribución de aportes (opcional con Recharts)
- Indicadores visuales (a favor/debe)
- Agregar icono en BottomNav: ⚖️ Balance

**Características:**
- Balance personal grande y visible
- Comparativa entre hermanos
- Historial de aportes del usuario
- Proyección de cuánto debe aportar

**Testing:**
- ✅ Balance del usuario correcto
- ✅ Cálculos precisos para todos
- ✅ Visualización clara y comprensible
- ✅ Navegación funciona

**Archivos a crear:**
- `src/features/Balance.tsx` (nuevo)
- Actualizar `src/components/BottomNav.tsx`
- Actualizar `src/App.tsx` (ruta `/balance`)

---

### ✅ FASE 4: Menú de Configuración
**Objetivo:** Página de configuración con acceso a gestión de datos

**Cambios:**
- Crear página `Settings.tsx`
- Menú con opciones:
  - 🏷️ Gestión de Categorías
  - 🏗️ Gestión de Proyectos
  - ⚙️ Configuraciones Generales
  - 👤 Perfil de Usuario
  - ℹ️ Acerca de
  - 🚪 Cerrar Sesión
- Agregar icono en BottomNav: ⚙️ Configuración

**Características:**
- Lista de opciones tipo menú
- Cada opción navega a su sub-página
- Diseño clean y organizado

**Testing:**
- ✅ Navegación a Settings funciona
- ✅ Todas las opciones visibles
- ✅ Click en cada opción navega correctamente

**Archivos a crear:**
- `src/features/Settings.tsx` (nuevo)
- Actualizar `src/components/BottomNav.tsx`
- Actualizar `src/App.tsx` (ruta `/settings`)

---

### ✅ FASE 5: Gestión de Categorías (CRUD)
**Objetivo:** Página para administrar categorías de gastos

**Cambios:**
- Crear página `CategoriesManager.tsx`
- Lista de todas las categorías existentes
- FAB "Agregar Categoría"
- Modal/formulario para crear categoría
- Opción de editar categoría (nombre, orden)
- Opción de eliminar categoría con validación

**Características:**
- Mostrar categorías ordenadas
- Contador de usos por categoría
- Validación: No eliminar si está en uso
- Confirmación antes de eliminar
- Reordenar categorías (drag & drop opcional)

**Validaciones:**
```javascript
// No permitir eliminar si:
- La categoría tiene transacciones asociadas
- Es la última categoría
```

**Testing:**
- ✅ Lista muestra todas las categorías
- ✅ Crear categoría funciona
- ✅ Editar categoría funciona
- ✅ Eliminar categoría sin uso funciona
- ✅ Eliminar categoría en uso muestra error

**Archivos a crear:**
- `src/features/CategoriesManager.tsx` (nuevo)
- `src/services/categoryService.ts` (nuevo)
- Actualizar `src/App.tsx` (ruta `/settings/categories`)

---

### ✅ FASE 6: Gestión de Proyectos (CRUD)
**Objetivo:** Página para administrar proyectos

**Cambios:**
- Crear página `ProjectsManager.tsx`
- Lista de todos los proyectos
- FAB "Agregar Proyecto"
- Modal/formulario para crear proyecto
- Opción de editar proyecto (nombre, presupuesto, estado)
- Opción de archivar/pausar proyecto
- Estadísticas por proyecto

**Características:**
- Mostrar proyectos con % de gasto
- Cambiar estado: Activo/Pausado/Completado
- Validación: No eliminar si tiene gastos
- Presupuesto editable

**Testing:**
- ✅ Lista muestra todos los proyectos
- ✅ Crear proyecto funciona
- ✅ Editar proyecto funciona
- ✅ Cambiar estado funciona
- ✅ No permite eliminar proyecto en uso

**Archivos a crear:**
- `src/features/ProjectsManager.tsx` (nuevo)
- `src/services/projectService.ts` (nuevo)
- Actualizar `src/App.tsx` (ruta `/settings/projects`)

---

## 🎨 Diseño del Bottom Navigation

```
┌────────────────────────────────────────┐
│                                        │
│           CONTENIDO                    │
│                                        │
│                                        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│  🏠      📊      💰      ⚖️      ⚙️   │
│ Inicio  Stats  Gastos  Balance Config │
└────────────────────────────────────────┘
```

**Características del BottomNav:**
- Fijo en la parte inferior
- 5 botones principales
- Icono + Label
- Indicador visual de página activa (color primary)
- Shadow superior para separación
- Safe area para iOS

---

## 📱 Responsive Behavior

### Mobile (< 768px)
- BottomNav siempre visible
- Labels pequeños
- Iconos 24px

### Desktop (>= 768px)
- BottomNav en la parte inferior
- Labels visibles
- Iconos 28px
- Opcional: Sidebar en lugar de bottom nav

---

## 🚀 Orden de Ejecución

### Fase 1 (Crítica - Base)
- BottomNav básico con 2 páginas existentes
- Testing completo antes de continuar

### Fase 2 (Alta prioridad)
- Página de gastos/historial
- FABs funcionales

### Fase 3 (Media prioridad)
- Página de balance
- Visualizaciones

### Fase 4 (Media prioridad)
- Menú de configuración
- Estructura base

### Fase 5 (Alta prioridad)
- CRUD de categorías
- Validaciones

### Fase 6 (Media prioridad)
- CRUD de proyectos
- Gestión completa

---

## ✅ Checklist por Fase

Antes de pasar a la siguiente fase:
- [ ] Código compila sin errores
- [ ] No hay warnings críticos
- [ ] Navegación funciona correctamente
- [ ] Responsive funciona en mobile y desktop
- [ ] Usuario probó y validó la funcionalidad
- [ ] Commit realizado con mensaje descriptivo

---

## 🎯 Resultado Final

Al completar todas las fases tendrás:
- ✅ Navegación bottom mobile-first
- ✅ 5 páginas principales funcionales
- ✅ Gestión completa de categorías y proyectos
- ✅ Experiencia de usuario optimizada para móvil
- ✅ PWA lista para instalar como app
- ✅ 100% funcional y gratis con Firebase Spark

---

## 🚦 Estado Actual

- [ ] Fase 1: Bottom Navigation Bar
- [ ] Fase 2: Página de Gastos
- [ ] Fase 3: Página de Balance
- [ ] Fase 4: Menú de Configuración
- [ ] Fase 5: Gestión de Categorías
- [ ] Fase 6: Gestión de Proyectos

---

## 📝 Notas

- Cada fase es independiente y testeable
- El usuario valida antes de continuar
- Se mantiene compatibilidad con funcionalidad existente
- Sin costos adicionales (Firebase Spark)
