import { ProgressData, CheckinSubmission } from '../types';
import { mockProgressByTimeframe } from '../data/mockProgress';
import { insforge } from '../lib/insforge';
import { upsertByDate } from './dbHelpers';
import { computeProgressData } from './metricsService';

export interface ProgressService {
  getProgress(timeframe?: '7d' | '30d' | '90d' | 'all'): Promise<ProgressData>;
  saveCheckin(data: CheckinSubmission): Promise<{ success: boolean; timestamp: string }>;
}

const today = () => new Date().toISOString().slice(0, 10);

class MockProgressService implements ProgressService {
  // Only a fallback for the brief window before onboarding writes the first
  // weigh-in/measurement (App.tsx already gates the app behind onboarding).
  private progressMap = { ...mockProgressByTimeframe };
  private checkinKey = 'futurepro_checkin_history';

  async getProgress(timeframe: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<ProgressData> {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (authData?.user) {
      const real = await computeProgressData(authData.user.id, timeframe);
      if (real) return real;
    }
    return JSON.parse(JSON.stringify(this.progressMap[timeframe]));
  }

  async saveCheckin(data: CheckinSubmission): Promise<{ success: boolean; timestamp: string }> {
    try {
      const existing = localStorage.getItem(this.checkinKey);
      const history = existing ? JSON.parse(existing) : [];
      history.push({ ...data, submittedAt: new Date().toISOString() });
      localStorage.setItem(this.checkinKey, JSON.stringify(history));
    } catch {
      // safe fallback
    }

    const { data: authData } = await insforge.auth.getCurrentUser();
    const userId = authData?.user?.id;
    if (userId) {
      const date = today();
      await upsertByDate('checkins', 'checkin_date', userId, date, {
        weight_kg: data.weightKg,
        waist_cm: data.waistCm,
        chest_cm: data.chestCm ?? null,
        arm_cm: data.armCm ?? null,
        fatigue_level: data.fatigueLevel,
        sleep_quality: data.sleepQuality,
        hunger_level: data.hungerLevel,
        notes: data.notes || null,
        front_photo_key: data.frontPhoto ?? null,
        side_photo_key: data.sidePhoto ?? null,
        back_photo_key: data.backPhoto ?? null
      });
      // Weight/waist are NOT sourced from checkins for trend purposes — write
      // them into weigh_ins/body_measurements too so each metric has one
      // source of truth (see CLAUDE.md "checkins" table note).
      await upsertByDate('weigh_ins', 'measured_on', userId, date, { weight_kg: data.weightKg });
      await upsertByDate('body_measurements', 'measured_on', userId, date, { waist_cm: data.waistCm });
    }

    return {
      success: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
}

export const progressService: ProgressService = new MockProgressService();
