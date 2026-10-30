/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TabType, UserProfile, RecompMetrics, WeeklyDayStatus, Workout, WorkoutSummaryRecord, ProgressData, WorkoutSet } from './types';
import { userService } from './services/userService';
import { workoutService } from './services/workoutService';
import { progressService } from './services/progressService';
import { profileService, ProfileUpdate } from './services/profileService';
import { computeDashboardWeekStatus, countCompletedSessionsThisWeek } from './services/metricsService';
import { useAuth } from './contexts/AuthContext';
import { AuthView } from './features/auth/AuthView';
import { OnboardingSetupView } from './features/onboarding/OnboardingSetupView';
import { WelcomeSummaryView } from './features/onboarding/WelcomeSummaryView';
import { EditProfileView } from './features/profile/EditProfileView';
import { Profile, OnboardingInput } from './types/profile';

// Common Components
import { TopAppBar } from './components/common/TopAppBar';
import { BottomNavBar } from './components/common/BottomNavBar';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { LiveWorkoutView } from './features/workout/LiveWorkoutView';
import { WorkoutSummaryView } from './features/workout/WorkoutSummaryView';
import { ProgressView } from './features/progress/ProgressView';
import { PlanView } from './features/workout/PlanView';
import { ProfileView } from './features/profile/ProfileView';

// Modals
import { ExerciseCatalogModal } from './features/exercises/ExerciseCatalogModal';
import { WeeklyCheckinModal } from './features/progress/WeeklyCheckinModal';

const OWNER_KEY = 'futurepro_cache_owner';

export default function App() {
  // Auth / onboarding gate
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  // undefined = not fetched yet, null = fetched but no profile row (needs onboarding)
  const [dbProfile, setDbProfile] = useState<Profile | null | undefined>(undefined);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('inicio');
  const [activeFlow, setActiveFlow] = useState<'none' | 'workout' | 'workout_summary'>('none');

  // Modal States
  const [isExerciseCatalogOpen, setIsExerciseCatalogOpen] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('Todos');
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shows the "here's what we detected / how the app works" screen once right
  // after onboarding, and again on demand from ProfileView ("¿Cómo funciona esto?").
  const [showWelcomeSummary, setShowWelcomeSummary] = useState(false);
  const [isWelcomeSummaryReplay, setIsWelcomeSummaryReplay] = useState(false);

  // Data State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<RecompMetrics | null>(null);
  const [weekStatus, setWeekStatus] = useState<WeeklyDayStatus[]>([]);
  const [weekSessionsDone, setWeekSessionsDone] = useState(0);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [planWorkouts, setPlanWorkouts] = useState<Workout[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progressTimeframe, setProgressTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [summaryData, setSummaryData] = useState<WorkoutSummaryRecord | null>(null);
  // Summary opened from Progreso → Historial (vs. the one shown right after finishing).
  const [historySummary, setHistorySummary] = useState<WorkoutSummaryRecord | null>(null);

  // A failed load must surface an error with a retry, never an endless spinner.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const failLoad = (err: unknown) => {
    console.error(err);
    setLoadError('No pudimos cargar tus datos. Revisa tu conexión e inténtalo de nuevo.');
  };

  // Per-device caches (plan, summary, user, metrics, check-ins) belong to one
  // account: wipe them, and the in-memory view state, whenever the account changes.
  const clearSessionState = () => {
    workoutService.clearUserState();
    userService.clearUserState();
    progressService.clearUserState();
    setUser(null);
    setMetrics(null);
    setWeekStatus([]);
    setWeekSessionsDone(0);
    setActiveWorkout(null);
    setPlanWorkouts([]);
    setProgressData(null);
    setSummaryData(null);
    setHistorySummary(null);
    setActiveFlow('none');
    setCurrentTab('inicio');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Fetch (or detect the absence of) the InsForge profile once the user is authenticated
  useEffect(() => {
    if (!authUser) {
      setDbProfile(undefined);
      return;
    }
    try {
      if (localStorage.getItem(OWNER_KEY) !== authUser.id) {
        clearSessionState();
        localStorage.setItem(OWNER_KEY, authUser.id);
      }
    } catch {
      clearSessionState();
    }
    setLoadError(null);
    profileService.getProfile(authUser.id).then(setDbProfile).catch(failLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, reloadKey]);

  const handleOnboardingComplete = async (input: OnboardingInput) => {
    if (!authUser) return;
    const profile = await profileService.completeOnboarding(authUser.id, input);
    setDbProfile(profile);
    setShowWelcomeSummary(true);
  };

  const handleSignOut = async () => {
    await signOut();
    clearSessionState();
    try {
      localStorage.removeItem(OWNER_KEY);
    } catch {
      // nothing stored
    }
    setDbProfile(undefined);
  };

  const handleUpdateProfile = async (update: ProfileUpdate) => {
    if (!authUser) return;
    const updated = await profileService.updateProfile(authUser.id, update);
    // Days/minutes/equipment shape the weekly plan: rebuild it from the new profile.
    workoutService.invalidatePlan();
    setDbProfile(updated);
    setIsEditProfileOpen(false);
    showToast('Datos actualizados');
  };

  // Initial Data Loading — only once the user is authenticated and onboarded
  useEffect(() => {
    if (!authUser || !dbProfile) return;
    setLoadError(null);
    userService.getCurrentUser().then(setUser).catch(failLoad);
    userService.getRecompMetrics().then(setMetrics).catch(failLoad);
    workoutService.getWorkout().then(setActiveWorkout).catch(failLoad);
    workoutService.getWorkoutPlan().then(setPlanWorkouts).catch(failLoad);
    workoutService.getLatestSummary().then(setSummaryData).catch(failLoad);
    progressService.getProgress(progressTimeframe).then(setProgressData).catch(failLoad);
    computeDashboardWeekStatus().then(setWeekStatus).catch(failLoad);
    countCompletedSessionsThisWeek().then(setWeekSessionsDone).catch(failLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, dbProfile, reloadKey]);

  // Update Progress when timeframe changes
  useEffect(() => {
    if (!authUser || !dbProfile) return;
    progressService.getProgress(progressTimeframe).then(setProgressData).catch(failLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressTimeframe]);

  // Handler: Add Protein
  const handleAddProtein = async () => {
    const updated = await userService.addProtein(25);
    setUser(updated);
    showToast('+25g de proteína añadidos al objetivo diario');
  };

  // Handler: Update Metrics
  const handleUpdateMetrics = async (newMetrics: { weightKg?: number; waistCm?: number }) => {
    const updated = await userService.saveMeasurement(newMetrics);
    setMetrics(updated);
    // Also refresh progress
    const refreshedProg = await progressService.getProgress(progressTimeframe);
    setProgressData(refreshedProg);
    showToast('Medidas guardadas con éxito');
  };

  // Handler: Finish Workout
  const handleFinishWorkout = async (durationMinutes: number) => {
    if (activeWorkout) {
      const summary = await workoutService.completeWorkout(activeWorkout.id, durationMinutes);
      setSummaryData(summary);
      // D-28: the plan (completed flag), today's session, week tracker and
      // adherence all change once a session is closed — reload them now, not
      // only on the next app start.
      workoutService.getWorkoutPlan().then(setPlanWorkouts).catch(failLoad);
      workoutService.getWorkout().then(setActiveWorkout).catch(failLoad);
      computeDashboardWeekStatus().then(setWeekStatus).catch(failLoad);
    countCompletedSessionsThisWeek().then(setWeekSessionsDone).catch(failLoad);
      progressService.getProgress(progressTimeframe).then(setProgressData).catch(failLoad);
      setActiveFlow('workout_summary');
      showToast('¡Entrenamiento completado con éxito!');
    }
  };

  // Handler: Save Set during active workout
  const handleSaveSet = async (exerciseId: string, set: WorkoutSet) => {
    if (activeWorkout) {
      const updated = await workoutService.saveWorkoutSet(activeWorkout.id, exerciseId, set);
      setActiveWorkout(updated);
    }
  };

  // Handler: Tab Selection
  const handleTabSelect = (tab: TabType) => {
    if (tab === 'entrenar') {
      setActiveFlow('workout');
    } else {
      setActiveFlow('none');
      setCurrentTab(tab);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-black border-t-transparent animate-spin mb-4" />
      </div>
    );
  }

  if (!authUser) {
    return <AuthView />;
  }

  if (loadError) {
    return (
      <div role="alert" className="w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-semibold text-[#191c1e] max-w-xs">{loadError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-5 py-2.5 rounded-full bg-black text-white font-bold text-xs cursor-pointer"
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-5 py-2.5 rounded-full bg-[#edeef0] text-black font-bold text-xs cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (dbProfile === undefined) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-black border-t-transparent animate-spin mb-4" />
      </div>
    );
  }

  if (dbProfile === null) {
    return <OnboardingSetupView onComplete={handleOnboardingComplete} />;
  }

  if (!user || !metrics || !activeWorkout || !progressData || !summaryData || weekStatus.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-black border-t-transparent animate-spin mb-4" />
        <p className="text-xs font-bold text-[#45474a] uppercase tracking-widest font-sans">
          Future Pro • Calibrando Plan
        </p>
      </div>
    );
  }

  if (showWelcomeSummary) {
    return (
      <WelcomeSummaryView
        user={user}
        profile={dbProfile}
        metrics={metrics}
        sessionsPerWeek={planWorkouts.length}
        continueLabel={isWelcomeSummaryReplay ? 'Entendido' : 'Empezar'}
        onContinue={() => {
          setShowWelcomeSummary(false);
          setIsWelcomeSummaryReplay(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#191c1e] antialiased selection:bg-black selection:text-white flex flex-col">
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 max-w-sm px-4 py-2.5 rounded-full bg-black text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-fade-in border border-white/20">
          <span className="material-symbols-outlined text-[16px] text-[#7ddb84]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Full-Screen Workflows */}
      {activeFlow === 'workout' ? (
        <LiveWorkoutView
          workout={activeWorkout}
          onClose={() => setActiveFlow('none')}
          onFinishWorkout={handleFinishWorkout}
          onSaveSet={handleSaveSet}
          onOpenExerciseList={() => setIsExerciseCatalogOpen(true)}
        />
      ) : activeFlow === 'workout_summary' ? (
        <WorkoutSummaryView
          summary={historySummary ?? summaryData}
          continueLabel={historySummary ? 'Volver al progreso' : 'Ver mi progreso'}
          onClose={() => {
            setHistorySummary(null);
            setActiveFlow('none');
            setCurrentTab('progreso');
          }}
          onContinue={() => {
            setHistorySummary(null);
            setActiveFlow('none');
            setCurrentTab('progreso');
          }}
          onShare={() => showToast('Resumen copiado para compartir')}
        />
      ) : (
        /* Standard App Shell with TopAppBar and BottomNavBar */
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col relative pb-24">
          <TopAppBar />

          {/* Tab Views */}
          {currentTab === 'inicio' && (
            <DashboardView
              user={user}
              metrics={metrics}
              weekStatus={weekStatus}
              weeklyCompletedCount={weekSessionsDone}
              weeklyTargetDays={dbProfile.days_per_week ?? 4}
              todaysWorkout={activeWorkout}
              onStartWorkout={() => setActiveFlow('workout')}
              onViewProgressDetails={() => setCurrentTab('progreso')}
              onSelectDiscipline={(disc) => {
                setSelectedCatalogCategory(disc);
                setIsExerciseCatalogOpen(true);
              }}
              onAddProtein={handleAddProtein}
            />
          )}

          {currentTab === 'plan' && (
            <PlanView
              planWorkouts={planWorkouts}
              onStartWorkout={(w) => {
                setActiveWorkout(w);
                setActiveFlow('workout');
              }}
              onOpenExerciseCatalog={() => setIsExerciseCatalogOpen(true)}
            />
          )}

          {currentTab === 'progreso' && (
            <ProgressView
              progressData={progressData}
              currentTimeframe={progressTimeframe}
              onSelectTimeframe={setProgressTimeframe}
              onOpenCheckin={() => setIsCheckinOpen(true)}
              historyRefreshKey={summaryData.completedAt}
              onOpenSession={(summary) => {
                setHistorySummary(summary);
                setActiveFlow('workout_summary');
              }}
            />
          )}

          {currentTab === 'perfil' && (
            <ProfileView
              user={user}
              metrics={metrics}
              profile={dbProfile}
              onUpdateMetrics={handleUpdateMetrics}
              onAvatarUpdated={(updatedProfile) => {
                setDbProfile(updatedProfile);
                setUser({
                  ...user,
                  avatarType: updatedProfile.avatar_type,
                  avatarAnimal: updatedProfile.avatar_animal,
                  avatarPhotoUrl: updatedProfile.avatar_photo_url
                });
              }}
              onSignOut={handleSignOut}
              onEditProfile={() => setIsEditProfileOpen(true)}
              onShowHowItWorks={() => {
                setIsWelcomeSummaryReplay(true);
                setShowWelcomeSummary(true);
              }}
            />
          )}

          {/* Persistent Floating Bottom Navigation Bar */}
          <BottomNavBar currentTab={currentTab} onSelectTab={handleTabSelect} />
        </div>
      )}

      {/* Global Modals */}
      <ExerciseCatalogModal
        isOpen={isExerciseCatalogOpen}
        onClose={() => setIsExerciseCatalogOpen(false)}
        initialCategory={selectedCatalogCategory}
      />

      <WeeklyCheckinModal
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        onCheckinSuccess={() => {
          showToast('Check-in enviado exitosamente');
          progressService.getProgress(progressTimeframe).then(setProgressData);
        }}
        currentWeight={metrics.currentWeightKg}
        currentWaist={metrics.currentWaistCm}
      />

      {isEditProfileOpen && dbProfile && (
        <EditProfileView
          profile={dbProfile}
          onSave={handleUpdateProfile}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}
    </div>
  );
}
