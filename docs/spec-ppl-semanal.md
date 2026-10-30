# Spec — Generador semanal Push / Pull / Legs

Estado: v1 implementada (2026-10-29). Código: `src/engine/ppl/`. Tests: `npm test`.

## 1. Objetivo

La app pasa de "recomposición corporal" a **mi app de entrenamiento PPL**. Cada semana
genera la rutina concreta (qué día, qué ejercicios, cuántas series, qué peso y cuántas
reps intentar) a partir de:

1. el perfil (días/semana, minutos por sesión, equipo disponible),
2. el catálogo real de ejercicios (`public/exercise-data/exercise_index.json`),
3. el historial real de series registradas (`workout_sets`).

Principio rector: **de una semana a otra cambian la intensidad y el rendimiento, no los
ejercicios** (sobrecarga progresiva). Los ejercicios de cada sesión son fijos; lo que
progresa es la carga y las repeticiones según lo que registraste.

### Fuera de alcance (v1)

- Mesociclos / semanas de descarga programadas.
- Rotación de ejercicios entre semanas.
- Elegir qué días de la semana entrenas (se usan días por defecto, §3.2).
- Recomposición: nutrición, % de grasa, check-ins y fotos **se ocultan** de la UI
  (flag `FEATURES.recomposition = false` en `src/config/features.ts`). El código y las
  tablas siguen intactos.

## 2. Arquitectura

```text
perfil + catálogo + historial ──► generateWeek()  (puro, determinista, sin I/O)
                                       │
                                       ▼
                                  WeeklyPlan  ──► planGenerator.ts (async: carga datos,
                                                   agrega GIF/nombre → Workout[])
                                                        │
                                                        ▼
                                                 workoutService (cache por semana)
```

| Módulo | Responsabilidad | I/O |
|---|---|---|
| `ppl/week.ts` | fechas, semana ISO (lunes), rotación del ciclo, días de entrenamiento | no |
| `ppl/templates.ts` | las 6 sesiones (Push/Pull/Legs × A/B) y sus huecos | no |
| `ppl/selection.ts` | elegir el ejercicio real de cada hueco | no |
| `ppl/progression.ts` | prescripción de carga/reps por ejercicio | no |
| `ppl/generateWeek.ts` | orquesta todo → `WeeklyPlan` | no |
| `planGenerator.ts` | adapta `WeeklyPlan` al tipo `Workout` de la UI | sí |
| `workoutService.ts` | cachea el plan de la semana actual y registra series | sí |

Todo lo que decide la rutina es **puro**: misma entrada → misma salida y no muta la
entrada. Por eso se puede testear en Node sin navegador ni backend.

## 3. Requisitos

### 3.1 Semana y rotación

- **R1** Una semana va de lunes a domingo. Las fechas se manejan como texto `YYYY-MM-DD`
  (sin zona horaria). `weekStartOf(fecha)` devuelve el lunes de esa semana.
- **R2** Días por semana admitidos: **3 a 6**. Fuera de rango se acota (2 → 3, 7 → 6);
  `null` → 4.
- **R3** El ciclo tiene 6 sesiones: `Push A → Pull A → Legs A → Push B → Pull B → Legs B`.
- **R4** El ciclo **continúa entre semanas**: la semana N empieza en la posición
  `(N × díasPorSemana) mod 6`, donde N = semanas transcurridas desde la semana ancla
  (la del alta del perfil). Ejemplos:
  - 3 días: S0 = Push A, Pull A, Legs A · S1 = Push B, Pull B, Legs B.
  - 4 días: S0 = PA, PuA, LA, PB · S1 = PuB, LB, PA, PuA.
  - 6 días: todas las semanas = el ciclo completo.
- **R5** Una semana anterior a la semana ancla se trata como N = 0.
- **R6** Ninguna sesión (tipo + variante) se repite dentro de la misma semana.

Limitación conocida: si cambias los días/semana a mitad de programa, la posición del ciclo
se recalcula con la fórmula nueva y puede saltar. Aceptado en v1.

### 3.2 Días de entrenamiento

- **R7** Días por defecto (0 = lunes):

| Días | Días de la semana |
|---|---|
| 3 | lun, mié, vie |
| 4 | lun, mar, jue, vie |
| 5 | lun, mar, mié, vie, sáb |
| 6 | lun a sáb |

  Domingo siempre es descanso.

### 3.3 Plantillas de sesión

- **R8** Cada sesión es una lista ordenada de huecos. El primer hueco es siempre el
  **principal** (compuesto pesado), por la regla `training.order.heavy_exercises_first`.
- **R9** Rol del hueco → series, reps y RIR:

| Rol | Series | Reps | RIR objetivo |
|---|---|---|---|
| `main` | 4 | 5-8 | 2-3 |
| `secondary` (compuesto) | 3 | 8-12 | 2-3 |
| `accessory` (aislamiento/core) | 3 | 10-15 | 2-3 |

  Rangos de `design.workout_split`; el RIR 2-3 es el default de la UI
  (`design.ui_training_defaults`, que resuelve `gap.rir_targets`). **No** se muestra "RIR 1-2" (no está respaldado).
- **R10** Variante A: principal horizontal (Push/Pull) o dominante de rodilla (Legs).
  Variante B: principal vertical (Push/Pull) o dominante de cadera (Legs). Así la semana
  cubre empuje/tracción horizontal y vertical y el tren inferior completo
  (`training.selection.major_muscle_groups`).
- **R11** Cada hueco declara un patrón de movimiento y una lista **curada** de ejercicios
  preferidos (IDs reales del dataset), ordenada de gimnasio → mancuernas → peso corporal.

### 3.4 Selección de ejercicios

- **R12** Un ejercicio es elegible si: existe en el catálogo, su `movement_pattern_review_status`
  es `inferred` o `validated`, y su `equipment_access` es compatible con el del usuario
  (`gym` ⊇ `minimal` ⊇ `none`; `unknown` nunca es compatible).
- **R13** Se toma el **primer preferido elegible** que no esté ya en la sesión.
- **R14** Si ningún preferido es elegible, respaldo: candidatos del catálogo con el mismo
  patrón, el tipo correcto (`compound` para main/secondary; `isolation` o `core` para
  accessory) y elegibles. Orden: confianza del patrón (alta > media), luego id ascendente.
- **R15** Si no hay candidato, el hueco se omite. Nunca se inventa un ejercicio.
- **R16** Todos los IDs preferidos de las plantillas existen en el catálogo, son elegibles
  y su patrón coincide con el del hueco (lo verifica un test contra el JSON real).
- **R17** Con equipo `gym`, todas las sesiones usan solo ejercicios preferidos (ningún respaldo).
- **R17b** Con equipo `gym`, ningún ejercicio aparece en dos huecos del ciclo: la progresión
  se calcula por ejercicio, y compartirlo entre un hueco 5-8 y uno 8-12 mezclaría los
  historiales. Con `minimal`/`none` el catálogo es más chico y puede repetirse (limitación
  aceptada).

### 3.5 Tiempo por sesión

- **R18** Duración estimada = series × 3 min (≈ 120 s de descanso + trabajo).
- **R19** Si la estimación supera `session_minutes`: (1) se quitan huecos desde el final
  mientras queden más de 4 ejercicios; (2) si aún sobra, los accesorios bajan de 3 a 2
  series, empezando por el último. El hueco principal nunca se quita. Puede quedar por
  encima del presupuesto: el mínimo es de 4 ejercicios y accesorios de 2 series
  (`design.workout_split`).
- **R20** Volumen semanal: con 6 días, ningún patrón de movimiento pasa de 20 series de
  trabajo por semana (rendimientos decrecientes en ~18-20 series según la discusión de `training.volume.hypertrophy_min_weekly_sets`).

### 3.6 Progresión (sobrecarga progresiva)

Entrada: historial del ejercicio. Solo cuentan las series `normal` (no `warmup` ni
`drop`), agrupadas por **día calendario local del usuario** (`localDate`; antes se usaba
el día UTC y una sesión nocturna se partía en dos — D-05), de la más reciente a la más
antigua. Peso de trabajo de una sesión = el peso máximo registrado en ella, y **solo las
series a ese peso** cuentan para las reps (las series más livianas de descarga se
ignoran — D-08). `plannedSets` = series prescritas al ejercicio **después** del ajuste
por tiempo (R19).

| # | Condición (sobre la última sesión) | Acción | Peso | Reps objetivo |
|---|---|---|---|---|
| P1 | sin historial | `start` | `null`: el usuario elige una carga para quedar en RIR 2-3 | mínimo del rango |
| P2 | al menos `plannedSets` series al peso de trabajo, todas ≥ techo, y peso > 0 (D-07: antes bastaba 1 serie) | `increase_load` | peso + incremento | mínimo del rango |
| P3 | igual que P2 pero con peso = 0 (peso corporal) | `hold` | 0 | techo (nota: añadir lastre) |
| P4 | las 2 últimas sesiones al mismo peso > 0 y en ambas alguna serie < mínimo del rango | `reduce_load` | `floor(peso × 0,9 / 2,5) × 2,5` (al menos 2,5 kg menos, nunca < 0) | mínimo del rango |
| P5 | alguna serie < mínimo (una sola sesión mala) | `hold` | igual | mínimo del rango |
| P6 | resto (incluye una sesión corta con todas las series registradas en el techo) | `add_reps` | igual | `min(techo, reps mínimas de la sesión + 1)` |

- **R21** Incremento: 5 kg para patrones de tren inferior (`knee_dominant`, `hip_dominant`,
  `knee_flexion`, `ankle_plantarflexion`, `hip_abduction`, `hip_adduction`); 2,5 kg para el resto.
- **R22** El RIR registrado **no** bloquea la subida: llegar al techo de reps en todas las
  series basta. (Cambio respecto de `design.progression` v1, que exigía además RIR ≤
  objetivo y así nunca progresaba si no se registraba RIR o si sobraban reps.)
- **R22b** El historial se lee paginado (hasta 10 páginas de 1.000 series), no solo las
  últimas 1.000 (D-16).
- **R23** Cada ejercicio prescrito incluye un resumen de la última sesión
  (`fecha`, `peso`, `reps[]`) cuando existe.

### 3.7 Salida

```ts
WeeklyPlan {
  weekStart: 'YYYY-MM-DD'      // lunes
  weekNumber: number           // 1-based desde la semana ancla
  daysPerWeek: 3|4|5|6
  startCursor: 0..5
  sessions: PlannedSession[]   // ordenadas por fecha
}
PlannedSession { id, date, dayType: 'push'|'pull'|'legs', variant: 'A'|'B',
                 title, focus, estimatedMinutes, exercises: PlannedExercise[] }
PlannedExercise { slotId, exerciseId, pattern, role, sets, repRange {bottom, top},
                  targetRir: '2-3', usedFallback, prescription }
```

- **R24** `id` de sesión = `${weekStart}_${dayType}_${variant}`: estable y único en la semana.
- **R25** Determinismo: misma entrada → salida idéntica (deep equal); la entrada no se muta.

### 3.8 Integración en la app

- **R26** `workoutService` cachea el plan junto con su `weekStart`. Al cambiar de semana
  se regenera solo (el historial de la semana pasada alimenta la progresión). Editar el
  perfil invalida el plan de la semana.
- **R27** "Entrenamiento de hoy" = la sesión con fecha de hoy; si no hay, la próxima sin
  completar; si no, la primera sin completar; si no, la primera.
- **R28** La vista Plan muestra la semana (número, fechas, tipo de sesión, "Hoy").
- **R29** Onboarding y edición de perfil piden 3-6 días/semana.

## 4. Plan de tests (`npm test`)

| Archivo | Cubre |
|---|---|
| `ppl/week.test.ts` | R1-R7 |
| `ppl/templates.test.ts` | R8-R11, R16, R17b (contra `exercise_index.json` real) |
| `ppl/selection.test.ts` | R12-R15 |
| `ppl/progression.test.ts` | P1-P6, R21-R23 |
| `ppl/generateWeek.test.ts` | R6, R10, R17-R20, R24, R25 + escenario multisemana |

R26-R29 son de integración con la UI: se verifican a mano en el navegador.
