# Reglas Prácticas de Prescripción (V1 Engine)

| ID Regla | Variable | Regla Lógica / Candidata | Prioridad | Evidencia ACSM (2026) |
| :--- | :--- | :--- | :--- | :--- |
| `RULE_VOL_HYPERSTROPHY_MIN` | Volumen semanal hipertrofia | `SI Objetivo == 'Hipertrofia' ENTONCES Series_Semanales >= 10` | IMPRESCINDIBLE | ≥10 series/sem mejoran hipertrofia |
| `RULE_VOL_STRENGTH_SETS` | Series por ejercicio fuerza | `SI Objetivo == 'Fuerza' ENTONCES Series_Ejercicio = 2..3` | IMPRESCINDIBLE | 2-3 series por ejercicio potencian fuerza |
| `RULE_FREQ_MIN_WEEKLY` | Frecuencia semanal | `Frecuencia_Semanal >= 2 dias/semana` | IMPRESCINDIBLE | ≥2 sesiones/sem mejoran fuerza |
| `RULE_INTENSITY_STRENGTH` | Carga % 1RM fuerza | `SI Objetivo == 'Fuerza' ENTONCES Carga >= 80% 1RM` | IMPRESCINDIBLE | Cargas ≥80% 1RM aumentan fuerza |
| `RULE_ORDER_HEAVY_FIRST` | Orden en sesión | `SI Ejercicio == 'Pesado' ENTONCES Posicion = Inicio_Sesion` | IMPRESCINDIBLE | Cargas pesadas al inicio optimizan fuerza |
| `RULE_EXECUTION_ROM` | Rango de movimiento | `Rango_Movimiento = Completo` | IMPRESCINDIBLE | Rango completo mejora fuerza |
| `RULE_PROGRESSION_GENERAL` | Sobrecarga progresiva | `Modo_Progreso = Progresion_Continua` | IMPRESCINDIBLE | El RT debe ser progresivo |
| `RULE_FAILURE_OPTIONAL` | Proximidad al fallo | `Fallo_Absoluto = Falso` | IMPRESCINDIBLE | El fallo muscular no es obligatorio |
| `RULE_EQUIPMENT_FLEXIBLE` | Equipamiento | `Equipamiento = Indiferente` | IMPRESCINDIBLE | Equipamiento no alteró resultados |
| `RULE_COMPLEXITY_FLEXIBLE` | Complejidad ejercicio | `Complejidad = Indiferente` | IMPRESCINDIBLE | Complejidad no alteró resultados |
| `RULE_ECCENTRIC_OVERLOAD` | Hipertrofia excéntrica | `Habilitar_Excentrico = Verdadero` | ÚTIL | Sobrecarga excéntrica mejora hipertrofia |
| `RULE_POWER_INTENSITY` | Potencia intensidad | `SI Objetivo == 'Potencia' ENTONCES Carga = 30-70% 1RM` | ÚTIL | Cargas 30-70% 1RM para potencia |
| `RULE_POWER_VOLUME` | Potencia volumen | `SI Objetivo == 'Potencia' ENTONCES Reps_Totales <= 24` | ÚTIL | Volúmenes ≤24 reps para potencia |
