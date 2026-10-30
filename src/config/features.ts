// Feature flags. The app is now a Push/Pull/Legs training app
// (docs/spec-ppl-semanal.md); recomposition (body metrics, nutrition,
// check-ins, photos) is hidden, not deleted — its code, services and tables
// stay intact so it can be turned back on.
export const FEATURES = {
  recomposition: false
} as const;
