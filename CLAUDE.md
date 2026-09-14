# Recomposición Corporal — PWA personal

## Qué es esto
Proyecto personal (lo usarán el usuario y sus amigos → multiusuario) de una PWA de recomposición corporal: ver rutina, registrar series/pesos, ver progreso y consultar ejercicios reales con GIF e instrucciones.

Pregunta que el sistema debe responder: *¿qué debo hacer hoy para perder grasa manteniendo/ganando músculo, y cómo sé si está funcionando?*

## Arquitectura objetivo (decidida 2026-09-14)
Primero se quiso algo mínimo; después el usuario decidió construir por capas, **sin AI Coach** por ahora:

```text
KNOWLEDGE BASE (evidencia estructurada) → RULES → DECISION ENGINE → PLAN → DATOS DEL USUARIO → AJUSTE SEMANAL
```

- Las rutinas deben salir de reglas + evidencia + datos del usuario, **nunca de un LLM inventándolas**.
- Los somatotipos (ecto/endo/meso) **no** son variable de prescripción.
- Fase actual: base de conocimiento en `knowledge/` — **Exercise, Training, Nutrition y Recomposition KB**. No construir backend, Decision Engine ni IA hasta que el usuario lo pida.
- La investigación la hace el usuario (exports tipo NotebookLM) y la deja en `knowledge/<dominio>/research/`. **Esos exports contienen errores de lectura** (definiciones tomadas como recomendaciones, dosis de estudios individuales presentadas como guía, números que no están en la fuente, etiquetas "Alta" que la fuente no asigna). Por eso cada regla se **verifica contra el texto completo** del paper antes de darla por buena:
  - Descargar con Europe PMC: `curl "https://www.ebi.ac.uk/europepmc/webservices/rest/<PMCID>/fullTextXML"`, pasar a texto y buscar con grep. No usar resúmenes automáticos (WebFetch) para números.
  - Regla verificada → `evidence.review_status: "verified"` + `locator` con sección/tabla/cita textual + `source_grade` si la fuente califica la evidencia.
  - Si la investigación contradice la fuente, gana la fuente; se corrige la regla y se explica en `review_notes` (el archivo en `research/` no se toca).
  - Se pueden agregar hallazgos que estén en la fuente aunque no estén en la investigación, marcados en `review_notes` como agregados en la verificación. Nunca números que no estén en la fuente.

## Knowledge Engine (`knowledge/`)
Capas separadas, nunca mezcladas: **crudo → normalizado → inferido → validado**.

```text
knowledge/
├── types.ts                         tipos de todos los JSON (usar desde la app / futuro engine)
├── sources/sources.json             registro de fuentes (PMID, DOI); todo source_id debe existir aquí
├── training/
│   ├── research/                    investigación original del usuario — NO editar
│   └── rules.json                   reglas estructuradas + gaps explícitos
├── nutrition/
│   ├── research/                    Nutrition_Knowledge_Base.json (ISSN 2017) — NO editar
│   └── rules.json
├── recomposition/
│   ├── research/                    recomposition_knowledge_base.json — NO editar
│   └── rules.json                   reglas de monitoring + matriz de evaluación + conflicts resueltos
├── design/
│   ├── parameters.json              NIVEL 2: decisiones de diseño (heurística) que llenan gaps
│   └── onboarding.json              NIVEL 1: datos y preferencias que se piden a cada usuario
└── exercises/
    ├── taxonomy.json                valores permitidos, mapas de equipo/músculos, `decisions` con motivos
    ├── classification_rules.json    reglas regex ordenadas (gana la primera) para inferir patrón/tipo
    ├── overrides.json               correcciones manuales → review_status "validated", mandan sobre lo inferido
    └── exercise_knowledge.json      GENERADO — no editar a mano
```

Comandos: `npm run knowledge:build` (regenera, determinista, idempotente) y `npm run knowledge:validate` (schema, referencias, enums, regex, y falla si el generado está desactualizado). Correr validate después de tocar cualquier archivo de `knowledge/`.

### Formato común de reglas (`training/`, `nutrition/`, `recomposition/rules.json`)
Tipos en `knowledge/types.ts` (`RulesFile`, `Rule`). El validador revisa los tres archivos juntos.
- `facts`: datos que el Decision Engine debe proveer para evaluar condiciones. `signals`: salidas que emiten alertas/evaluaciones/decisiones. Un fact o signal con el mismo nombre en dos archivos debe tener **definición idéntica**.
- `applies_when`: `null` (siempre) o un grupo con exactamente uno de `all` / `any`, anidable. Condición: `{fact, op, value}`.
- `kind` → `prescription` / `option` / `no_consistent_effect` usan `prescribe` (`{variable, min/max}` o `{variable, value}`; mismo `group` = alternativas). `alert` / `assessment` / `decision` usan `emit` (`{signal, value}`).
- IDs con prefijo de dominio (`training.`, `nutrition.`, `recomposition.`), únicos entre archivos. `see_rules` y `conflicts[].affects` deben apuntar a IDs existentes.
- `evidence.basis`: `evidence` (default) o `heuristic` (lógica de decisión construida sobre una fuente, no un hallazgo). `source_id` puede ser `null` solo en gaps/decisiones de diseño.
- `limitations` son del autor; `review_notes` son observaciones de integridad agregadas al estructurar (números que no aparecen en el hallazgo, ambigüedades, choques). No mezclar.
- Cada regla conserva `original` (ID, condición y acción de la investigación) para trazabilidad. Reglas con `switch` en la investigación se separan en una regla por caso.
- `conflicts`: cuando dos archivos de investigación se contradicen, se registran ambas versiones y se resuelven **contra el texto de la fuente** (`status: resolved` + `resolution` + `resolution_evidence`, exigidos por el validador). Solo quedan `pending_author_decision` si la fuente no permite decidir.
- `evidence.quality`: `not_stated` cuando la fuente no asigna alta/moderada/baja (ni ACSM 2026 ni ISSN 2017 lo hacen). La calificación propia de la fuente va en `source_grade` (p.ej. ACSM: "QoE 79%, 6 revisiones, n=6.574").

### Nutrition / Recomposition
- Estado (2026-09-14): training 20 reglas / nutrition 13 / recomposition 7. Training y nutrition 100% verificadas contra el texto completo; en recomposition, las reglas de monitoring son heurísticas de diseño (`basis: heuristic`) salvo la alerta de tasa de pérdida y la auditoría (verificadas).
- Nutrition, corregido tras verificar el ISSN 2017: proteína 1,4-2,0 g/kg aplica en cualquier fase (no solo mantenimiento/superávit); 2,3-3,1 g/kg FFM solo magros entrenados en déficit; **no existen** en la fuente: 1,0-2,5 kg/semana para obesidad (era el objetivo de las dietas VLED), grasa 20-35% (definición de dieta baja en grasa), 0,25-0,40 g/kg por comida, superávit 300-500 / 100-300 kcal. Macros flexibles. La corrección por adaptación metabólica solo aplica sin fuerza o con proteína baja.
- Gaps abiertos de nutrition: umbrales de `body_fat_category`, magnitud del déficit y del superávit, tasa de pérdida para no magros, estimación de FFM, fase energética para "recomposición".
- Recomposition: solo las 7 reglas de monitoring. Sus módulos training/nutrition duplicaban las otras KBs y no se importaron; los 4 conflicts están **resueltos** contra las fuentes (1,6-2,4 g/kg descartado; volumen en déficit descartado —el ACSM no menciona el déficit—; "cerca del fallo" → regla `training.effort.sufficient_effort` sin RIR fijo; macros flexibles).
- Gaps críticos de recomposition: definición de tendencias (ventana/umbral), escenario peso estable + cintura bajando no evaluado, estimación de 1RM, magnitud del ajuste.

### Training rules (`training/rules.json`)
- facts: `target_adaptation`, `exercise.load_pct_1rm`, `advanced_techniques_enabled`.
- `no_consistent_effect` = la evidencia dice que no importa → el motor elige por preferencia/disponibilidad.
- Verificado en ACSM 2026: esfuerzo alto requerido (fallo no necesario; "cerca del fallo" o 2-3 RIR como ejemplos, sin meta exacta); la carga no afecta la hipertrofia (30-100% 1RM); el orden de ejercicios y la frecuencia (con volumen igualado) tampoco; rendimientos decrecientes >~18-20 series/semana; descanso <1 vs >1 min no afectó la fuerza; la experiencia tuvo impacto mínimo. Cubrir empuje/tracción superior/inferior (+ horizontal/vertical) es la recomendación de los autores para "todos los grupos musculares".
- `gaps` abiertos: RIR exacto, descanso para hipertrofia, ajuste en déficit (el ACSM no lo trata), mapeo recomposición→adaptación. La UI muestra "Óptimo: RIR 1-2": **no** está respaldado (la fuente menciona 2-3 RIR solo como ejemplo).

### Tres niveles de parámetros (decidido 2026-09-14)
La app la usarán el usuario **y sus amigos**: nada se hardcodea a una persona.
1. **Onboarding (`design/onboarding.json`)**: solo datos que el usuario conoce y preferencias suyas — sexo, edad, altura, peso, cintura/cuello/(cadera), % grasa medido opcional, experiencia, días/semana, minutos, equipo, actividad diaria, deporte de resistencia, frecuencia de pesaje, qué registra de comida, objetivo (solo recomposición en v1) y ritmo (conservador 0,5% / moderado 0,75% / rápido 1,0%, hasta 1,25% con grasa alta). Cada campo declara `why` y `feeds`.
2. **Sistema (`design/parameters.json`)**: umbrales, fórmulas y matriz — iguales para todos, **no se preguntan**, pero se adaptan a lo que registra cada usuario (p.ej. ventana de tendencia 2/3/4 semanas según pesaje diario/3×/semanal). Todo es `basis: heuristic`; cambiarlos sube `parameters_version`.
3. **Evidencia (`*/rules.json`)**: no ajustable desde la app.

Decisiones v1 (ids `design.*`): objetivo recomposición → déficit + hipertrofia principal / fuerza secundaria; grasa por método Navy con cortes H <15/15-25/>25, M <23/23-32/>32; ritmo acotado por categoría de grasa, déficit = ritmo% × peso × 7700/7, piso = BMR; gasto inicial Mifflin-St Jeor × actividad, recalibrado cada 3 semanas con ingesta real (≥5 días registrados/semana); proteína meta max(2,0 g/kg, 2,3 g/kg FFM si magro entrenado), cumple si ≥1,4 g/kg; tendencias por promedios semanales (peso estable <±0,2%/sem, cintura <±0,5 cm comparando 2 vs 2 mediciones, fuerza <±2,5% mediana de e1RM en compuestos, 14 vs 14 días); e1RM Epley con reps+RIR ≤12 y RIR ≤4; UI por defecto 2-3 RIR y 120 s de descanso.
- Fórmulas externas registradas en `sources.json` como `method_reference` con `verification: not_verified`.
- Los gaps siguen existiendo (la evidencia no los responde) pero apuntan a su `design_decision`. Abiertos sin decisión: `gap.rest_between_sets`, `gap.rep_ranges`, `gap.rir_targets` (con `app_default`) y `gap.macro_split_method` (preferencia libre).
- Reglas creadas desde diseño: `evidence.review_status: "design_decision"`, `basis: "heuristic"`, `source_id: null`, `design_ref`. El validador lo exige y verifica referencias cruzadas gap↔decisión, fuentes de métodos y `feeds` del onboarding.
- Pendiente de implementar en la app: `mockOnboarding.ts` y `LiveWorkoutView.tsx` todavía muestran "RIR 1-2" y déficits fijos (-15%, -300 kcal) no respaldados.

### Exercise knowledge (`exercises/`)
- Cada atributo lleva `{value, confidence, method, review_status}`. `review_status`: `inferred` (confianza alta/media), `needs_review` (baja, fallback por target, o unknown), `validated` (override), `not_assessed` (no se intentó: el dataset no tiene señal).
- `difficulty`, `technical_complexity`, `stability_demand`, `fatigue_cost` y `mechanical_role` de compuestos (primary vs secondary) quedan `not_assessed` a propósito: solo se llenan por overrides revisados.
- Hallazgos del dataset (calculados en cada build, en `dataset_findings`): `muscle_group` siempre = `secondary_muscles[0]` (no es el músculo principal; se usa `target`), `category` = `body_part`, 38 variantes de medio (male/female/pov) agrupadas en `variant_group`, 6 nombres duplicados.
- Estado v1: 1.182/1.324 inferidos, 142 needs_review (56 sin patrón: calistenia isométrica, nombres genéricos tipo "dumbbell raise").
- Para corregir clasificación: preferir ajustar `classification_rules.json` si el error es de un patrón de nombres; usar `overrides.json` para casos puntuales.

## Stack
- React 19 + Vite 6 + TypeScript + Tailwind (proyecto originado en Google AI Studio, usa `@google/genai`).
- `vite-plugin-pwa` para instalar como PWA.
- **Backend: InsForge** (Postgres + auth + storage), proyecto **fitness-app** (`b7af6f55-9406-48ed-8ffe-85dc8bad7153`, `https://s6iy9yut.us-east.insforge.app`), enlazado el 2026-09-14 y vacío en ese momento. Usar los skills `insforge-cli` (infra, migraciones, RLS) e `insforge` (código con `@insforge/sdk`); CLI siempre como `npx -y @insforge/cli`. Ver `AGENTS.md`.
  - **No usar `cashflow-personal`** (`3568b0e0-…`): es otra app con datos reales.
  - Plan Free: máximo 2 proyectos activos; `memory remember` de InsForge no funciona en Free.
  - `.insforge/project.json` contiene la API key admin: está en `.gitignore`, nunca commitear ni exponer al frontend.
- **Esquema aplicado** (migración `migrations/20260914200055_create-recomposition-schema.sql`, 2026-09-14).
- **Auth + servicios reales integrados** (2026-09-14, `@insforge/sdk` instalado):
  - `src/lib/insforge.ts` — cliente (`VITE_INSFORGE_URL`/`VITE_INSFORGE_ANON_KEY` en `.env`, real en este equipo, nunca commiteado).
  - `src/contexts/AuthContext.tsx` + `src/features/auth/AuthView.tsx` — registro/login con verificación por código de 6 dígitos (`verifyEmailMethod: "code"` del proyecto), sesión persistida por el SDK.
  - `src/features/onboarding/OnboardingSetupView.tsx` + `src/services/profileService.ts` — onboarding real (todos los campos de `knowledge/design/onboarding.json`); al enviarlo crea `profiles` + la primera fila de `weigh_ins`/`body_measurements`. `App.tsx` bloquea la app hasta que exista un `profiles` propio (`dbProfile === null` → onboarding; `undefined` → cargando).
  - `src/services/workoutService.ts` — el estado de edición en vivo sigue siendo el template local (`mockPlanWorkouts`, igual que antes), pero cada serie guardada además escribe en `workout_sessions`/`workout_sets` reales (sesión creada perezosamente al primer set, cerrada en `completeWorkout`). Es un canal adicional de solo-escritura (`void`), no bloquea la UI si falla.
  - `src/services/progressService.ts` (`saveCheckin`) y `src/services/userService.ts` (`saveMeasurement`) — escriben en `checkins`/`weigh_ins`/`body_measurements` reales; `src/services/dbHelpers.ts` (`upsertByDate`) resuelve el choque de `UNIQUE(user_id, fecha)` con insert→si 409/duplicate→update (el SDK no trae upsert todavía).
  - **A propósito no se tocó**: `ProgressData`/`RecompMetrics` (tendencias, % grasa, índice de fuerza) siguen siendo mock — calcularlas de verdad es el Decision Engine (`design.trends`, método Navy), que sigue sin construirse. Solo se conectó la **persistencia** de los datos crudos, no su interpretación.
  - **Fotos del check-in siguen simuladas** (URLs de Unsplash hardcodeadas en `WeeklyCheckinModal.tsx`) — no hay captura de cámara ni subida real al bucket `checkin-photos` todavía; `checkins.front_photo_key` etc. se guardan como `null`.
  - **Verificado end-to-end** con Playwright contra el backend real: registro → código OTP → onboarding (fila real en `profiles`/`weigh_ins`/`body_measurements`) → iniciar entrenamiento → guardar serie (filas reales en `workout_sessions`/`workout_sets`). Para poder automatizarlo sin acceso a un correo real, se desactivó temporalmente `require_email_verification` vía `config apply`, se corrió la prueba, y se revirtió a `true` inmediatamente después (confirmado con `config plan`); los datos de prueba se borraron. Quedaron dos cuentas de prueba huérfanas en `auth.users` (`e2e-test-recomp@example.com` sin verificar, `e2e-test-recomp-2@example.com` verificada) — sin filas en ninguna tabla de la app; no hay forma documentada de borrar un usuario de auth por CLI/SDK.
- **Plomería adicional conectada** (2026-09-14, sin tocar features nuevas — solo cerrar huecos de lo ya construido):
  - `userService.getCurrentUser()` ahora trae nombre/correo reales de `auth.users` y la proteína de hoy desde `food_logs`; el resto del perfil (objetivo, coach, semana/fase) sigue mock — eso es contenido del futuro Decision Engine, no identidad.
  - `userService.addProtein()` ya no suma solo en memoria: lee la fila de `food_logs` de hoy, suma los gramos y la actualiza de verdad (vía `upsertByDate`).
  - **Editar el perfil después del onboarding**: `profileService.updateProfile()` + `EditProfileView.tsx` (botón "Editar mis datos" en `ProfileView`). Edita las preferencias (`sex`, `age_years`, `height_cm`, experiencia, días/semana, equipo, actividad, ritmo, etc.) — **no** toca peso/cintura/cuello/cadera, que son series de tiempo y se editan por la vía normal (check-in o el editor de métricas de `ProfileView`, ya conectados).
  - `src/services/dbHelpers.ts` (`upsertByDate`) — el SDK todavía no trae `.upsert()`; hace insert y, si choca con el `UNIQUE(user_id, fecha)`, hace update. Lo usan `weigh_ins`, `body_measurements`, `checkins`, `food_logs`.
  - **Fotos del check-in reales**: `WeeklyCheckinModal.tsx` ahora abre la cámara/galería (`<input type="file" capture="environment">`), sube el archivo a `insforge.storage.from('checkin-photos')` y guarda la `key` real en `checkins.front_photo_key`/`side_photo_key`/`back_photo_key`. La preview es un `URL.createObjectURL` local (el bucket es privado, no hay URL pública que mostrar directo).
  - **RLS de `storage.objects` habilitada** (migración `20260914202931_storage-objects-owner-rls.sql`): en instalaciones nuevas de InsForge esa tabla nace con RLS **desactivado** y sin políticas, o sea que cualquier usuario autenticado podía leer los objetos de cualquier bucket de cualquier otro usuario. Se aplicó el patrón "owner-only" del skill (`uploaded_by = auth.jwt()->>'sub'`) antes de subir la primera foto real. Advisor: 0 hallazgos críticos/warning tras aplicarla (1 info: índice `workout_sets_exercise_idx` sin uso todavía — esperado, no hay datos de verdad aún).

### Esquema de base de datos (`migrations/`)
7 tablas en `public`, todas con RLS activo y aisladas por `user_id = auth.uid()` (verificado: `diagnose advisor` → 0 hallazgos; políticas revisadas una por una — 28 políticas, todas `TO authenticated`, todas con `auth.uid()`). Derivado directo de `knowledge/design/onboarding.json` (nivel 1) y los `facts` de `knowledge/*/rules.json` (nivel 3) — cada tabla existe para alimentar un fact o una decisión de diseño concreta, no por simetría con la UI actual.

- **`profiles`** (PK `user_id`) — las respuestas del onboarding: `sex`, `age_years`, `height_cm`, `training_experience`, `days_per_week`, `session_minutes`, `equipment_access`, `daily_activity`, `endurance_or_high_intensity_sport`, `weigh_in_frequency`, `food_logging`, `goal` (solo `'recomposition'` en v1), `pace`. Los `CHECK` reproducen los enums de `onboarding.json` — si se agrega una opción ahí, hay que agregarla también en el `CHECK` con una migración nueva.
- **`weigh_ins`** — peso diario (`user_id, measured_on` único). Alimenta `weight_trend` (`design.trends`).
- **`body_measurements`** — cintura/cuello/cadera + `body_fat_override_pct` opcional. Alimenta el método Navy (`design.body_composition`) y `waist_trend`.
- **`checkins`** — el check-in semanal cualitativo (fatiga/sueño/hambre, notas, fotos) de `WeeklyCheckinModal`/`CheckinSubmission`. Las fotos van al bucket privado `checkin-photos` (solo se guarda la `key`, no la imagen). **Decisión:** peso/cintura del check-in NO son la fuente de verdad de tendencias — el código de la app debe escribirlos también en `weigh_ins`/`body_measurements` al enviar el check-in, para que cada métrica tenga una sola fuente.
- **`food_logs`** — calorías/proteína diarias (`user_id, log_date` único). Alimenta la recalibración de gasto (`design.energy_expenditure`) y `protein_intake_meets_target` (`design.protein_target`).
- **`workout_sessions`** / **`workout_sets`** — reemplaza el `localStorage` de `workoutService.ts`. `workout_sets` no tiene `user_id` propio: su RLS resuelve dueño vía `EXISTS` contra `workout_sessions` (un solo salto, no recursivo). `exercise_id`/`exercise_name` son texto plano — **no hay FK a una tabla de ejercicios**: el Exercise Knowledge Base sigue siendo el JSON estático de `public/exercise-data/`, a propósito, para no duplicar 1.324 filas ni mantener dos fuentes. Alimenta `design.one_rm_estimation` (Epley con `reps+rir`) y `heavy_load_strength_trend`.
- Todas las tablas con `updated_at` usan el trigger `system.update_updated_at` (ya existía en el proyecto InsForge).
- Bucket de storage: `checkin-photos` (privado). También `avatars` (público, migración `20260921000000_profile-avatar.sql`) — columnas nuevas en `profiles`: `avatar_type` ('animal'|'photo'), `avatar_animal` (id de un set fijo de 12 emojis, `src/data/animalAvatars.ts`), `avatar_photo_key`/`avatar_photo_url`. Público porque no hay nada sensible ni forma de enumerar avatares de otros usuarios sin conocer su key; reemplaza el `avatarUrl` mock que traía la app original.
- Aún **no es un repo git** (a la fecha de este documento).

## Estructura
- `src/features/*` — vistas: dashboard, onboarding, plan/entrenamiento en vivo, progreso, perfil, catálogo de ejercicios.
- `src/services/*` — capa de datos (`exerciseService`, `workoutService`, etc.), hoy mayormente mock salvo ejercicios.
- `src/data/*` — datos mock (`mockWorkout.ts`, `mockUser.ts`, `mockProgress.ts`, `mockOnboarding.ts`) + capa de ejercicios reales.
- `src/types/index.ts` — tipos compartidos de dominio (`Exercise`, `Workout`, `ProgressData`, etc.).

## Base de datos de ejercicios (ya integrada)
Fuente real: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) — 1,324 ejercicios, MIT (datos) + medios con permiso de Gym visual (atribución obligatoria).

- **Dataset crudo, intacto**, servido como estático en `public/exercise-data/` (`data/exercises.json`, `images/`, `videos/*.gif`, `NOTICE.md`, `LICENSE-data.txt`). No se edita a mano.
- `src/data/rawExercise.types.ts` — tipo del registro crudo (`RawExercise`).
- `src/data/exerciseTranslations.ts` — mapas fijos ES para `body_part`, `equipment` y nombres de músculo (vocabularios cerrados, ~10/27/50 valores). No inventa traducciones libres, es un diccionario 1:1.
- `src/data/exerciseAdapter.ts` — convierte `RawExercise` → `Exercise` (el tipo que consume la UI). Usa `instruction_steps.es` del propio dataset (ya viene traducido profesionalmente) en vez de traducir nosotros.
- `src/services/exerciseService.ts` — hace `fetch` del JSON una vez, cachea en memoria, filtra por categoría/bodyPart/búsqueda. Misma interfaz que antes (drop-in).
- Atribución "© Gym visual — gymvisual.com" se muestra en el detalle de cada ejercicio (`ExerciseCatalogModal.tsx`) — **no quitar**, es requisito de licencia de los medios, no decorativo.
- Las categorías del catálogo (`ExerciseCatalogModal.tsx`) ahora son body parts reales en español (Pecho, Espalda, Hombros, Brazo, Antebrazo, Pierna, Pantorrilla, Abdomen/Core, Cardio, Cuello), no las etiquetas inventadas ("Fuerza"/"Hipertrofia") que tenía el mock.
- Tamaño: `public/exercise-data/` pesa ~155 MB (imágenes 12 MB + gifs 127 MB). Los `.jpg`/`.gif` no entran en el precache de `vite-plugin-pwa` por defecto (solo cachea `js/css/html/ico/png/svg`), así que no infla el install de la PWA — cargan bajo demanda y el navegador los cachea normal.

## Ejercicios curados para las plantillas de rutina
`mockWorkout.ts` ya no usa ejercicios inventados: importa `Exercise` reales desde `src/data/curatedExercises.ts`.

- `scripts/generateCuratedExercises.ts` — script reproducible (`npx tsx scripts/generateCuratedExercises.ts`) que toma una lista fija de IDs reales del dataset (`CURATED_IDS`), los pasa por el mismo `exerciseAdapter`/traducciones que usa el catálogo, y regenera `src/data/curatedExercises.ts`.
- `src/data/curatedExercises.ts` es **auto-generado** — no editar a mano, volver a correr el script si cambian `CURATED_IDS` o la lógica del adapter.
- Para agregar más ejercicios curados: buscar el `id` real en `public/exercise-data/data/exercises.json`, agregarlo a `CURATED_IDS` en el script, y regenerar.
- `mockExercises.ts` (los 6 ejercicios inventados originales) se eliminó — ya no tenía referencias tras este cambio.
- El bloque de pierna en `mockPlanWorkouts` ("PIERNA & CADENA POSTERIOR A") ahora tiene 2 ejercicios reales (sentadilla y peso muerto rumano) en vez de un array vacío con `exercisesCount: 5` engañoso; el count se ajustó a lo que realmente hay.

## Registro real de series/pesos (ya implementado)
`LiveWorkoutView.tsx` dejó de ser una maqueta estática (antes tenía "Serie 1/2/3/4" hardcodeadas con valores fijos y `currentExIndex` que nunca cambiaba) y ahora es 100% dirigida por los datos reales de `workout.exercises`:

- La serie activa es la primera con `status !== 'completed'`; su editor (steppers de peso/reps + selector de RIR) se resiembra desde los valores de esa serie (`useEffect` con key `activeSet?.id`) cada vez que cambia, no en cada tecla.
- Al guardar, llama a `onSaveSet(exerciseId, set)` → `workoutService.saveWorkoutSet` → persiste en `localStorage` y marca la siguiente serie como `in_progress`.
- Navegación real entre ejercicios del workout (flechas ◀▶ + contador "Ejercicio X de N"), con imagen/GIF real (`ExerciseMedia`), nombre, músculo objetivo, última sesión y objetivo de hoy actualizándose por ejercicio.
- **`workoutService.ts` se reescribió**: antes solo trackeaba **un** workout activo en `localStorage` (`futurepro_active_workout_state`) e ignoraba el `workoutId` que le pasaban — si elegías otra rutina del plan (`PlanView`) y registrabas una serie, se perdía silenciosamente porque el ejercicio no existía en el workout trackeado. Ahora persiste **todo el plan** (`futurepro_plan_state`) y busca el workout correcto por `id` en cada operación.
- Verificado en navegador real (Playwright headless): GIF real cargando (no roto), edición de peso/reps/RIR, guardado con los valores realmente ingresados, avance de serie, y navegación entre ejercicios — todo sin errores de consola.

## Pendiente (no implementado todavía)
- Las otras 2 rutinas del plan ("TORSO & DENSIDAD B", "PIERNA & GLÚTEO B") siguen con `exercises: []`. Mismo patrón que en curatedExercises: agregar IDs reales a `CURATED_IDS` y regenerar.
- Progreso (`mockProgress.ts`), perfil (`mockUser.ts`) y onboarding (`mockOnboarding.ts`) siguen 100% mock — no reflejan lo que realmente se registra entrenando.
- `WorkoutSummaryView`/`mockSummaryData.exerciseBreakdown` sigue con nombres de ejercicio hardcodeados en español (p.ej. "Press Banca Plano") que ya no coinciden con los nombres reales del dataset (en inglés, p.ej. "Barbell bench press" — el dataset no trae `name` traducido, solo instrucciones). Es cosmético, no rompe nada.
- `resetActiveWorkout()` solo resetea el primer workout del plan (`plan[0]`), no cualquiera por id — suficiente para el uso actual (un solo workout "de hoy"), pero si se necesita resetear una rutina específica hay que ampliarlo.

## Reglas de trabajo en este proyecto
1. El dataset crudo en `public/exercise-data/` y la investigación en `knowledge/*/research/` no se modifican. Cualquier enriquecimiento va en capas nuevas (knowledge generado, overrides, adapters), nunca sobrescribiendo la fuente.
2. Preferir soluciones deterministas (reglas, mapas, filtros) sobre LLM/API externa para cosas que no lo necesitan.
3. No agregar backend, auth, IA "coach" ni Decision Engine hasta que el usuario lo pida — la fase actual es solo la base de conocimiento.
4. Si algo no se puede derivar con confianza, marcarlo `unknown` / `needs_review` en vez de inventarlo. No inventar evidencia científica ni números que no estén en la fuente verificada.
5. Sin dependencias nuevas salvo necesidad clara; los scripts de `knowledge/` usan solo Node + `tsx`.
