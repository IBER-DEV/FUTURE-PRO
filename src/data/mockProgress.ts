import { ProgressData } from '../types';

// Fallback only, for the brief moment before onboarding writes the first
// weigh-in/measurement (App.tsx already gates the app behind onboarding).
// Every value is empty/null, never a fabricated number.
const emptyProgress = (timeframe: ProgressData['timeframe']): ProgressData => ({
  timeframe,
  weightKg: 0,
  weightDelta: 'Sin datos suficientes',
  weightTrendDirection: null,
  waistCm: 0,
  waistDelta: 'Sin datos suficientes',
  waistTrendDirection: null,
  leanMassKg: 0,
  leanMassDelta: 'Sin datos suficientes',
  leanMassTrendDirection: null,
  fatPercent: 0,
  fatPercentDelta: 'Sin datos suficientes',
  recompRatio: '—',
  strengthIndexPercent: 0,
  strengthIndexStatus: 'insufficient_data',
  strengthHighlights: [],
  weeklyAdherencePercent: 0,
  adherenceRatio: '0/0',
  weekDays: [
    { letter: 'L', status: 'pending' },
    { letter: 'M', status: 'pending' },
    { letter: 'X', status: 'pending' },
    { letter: 'J', status: 'pending' },
    { letter: 'V', status: 'pending' },
    { letter: 'S', status: 'pending' },
    { letter: 'D', status: 'pending' }
  ],
  chartPoints: []
});

export const mockProgressByTimeframe: Record<'7d' | '30d' | '90d' | 'all', ProgressData> = {
  '7d': emptyProgress('7d'),
  '30d': emptyProgress('30d'),
  '90d': emptyProgress('90d'),
  all: emptyProgress('all')
};
