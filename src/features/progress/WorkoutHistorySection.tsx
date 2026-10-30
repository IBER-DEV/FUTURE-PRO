import React, { useEffect, useState } from 'react';
import { WorkoutSummaryRecord } from '../../types';
import { getSessionSummary, listCompletedSessions } from '../../services/sessionHistoryService';
import { HistorySessionRow } from '../../services/workoutSummary';

interface WorkoutHistorySectionProps {
  // Changes when a workout is finished, so the list picks up the new session.
  refreshKey?: string;
  onOpenSession: (summary: WorkoutSummaryRecord) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });

const formatVolume = (kg: number | string | null) =>
  kg == null ? null : `${Math.round(Number(kg)).toLocaleString('es')} kg`;

export const WorkoutHistorySection: React.FC<WorkoutHistorySectionProps> = ({ refreshKey, onOpenSession }) => {
  const [sessions, setSessions] = useState<HistorySessionRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const loadFirstPage = () => {
    let cancelled = false;
    setStatus('loading');
    listCompletedSessions(0)
      .then((res) => {
        if (cancelled) return;
        setSessions(res.sessions);
        setHasMore(res.hasMore);
        setPage(0);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  };

  useEffect(loadFirstPage, [refreshKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await listCompletedSessions(page + 1);
      setSessions((prev) => [...prev, ...res.sessions.filter((s) => !prev.some((p) => p.id === s.id))]);
      setHasMore(res.hasMore);
      setPage(page + 1);
    } catch {
      setStatus('error');
    } finally {
      setLoadingMore(false);
    }
  };

  const open = async (session: HistorySessionRow) => {
    setOpenError(null);
    setOpeningId(session.id);
    try {
      onOpenSession(await getSessionSummary(session));
    } catch {
      setOpenError('No pudimos abrir ese entrenamiento. Inténtalo de nuevo.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section aria-labelledby="history-heading" className="flex flex-col gap-3">
      <h2 id="history-heading" className="text-[17px] font-bold text-black">
        Historial de entrenamientos
      </h2>

      {status === 'loading' && (
        <div role="status" aria-label="Cargando historial" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] rounded-2xl bg-[#edeef0] animate-pulse" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="rounded-2xl bg-white border border-[#c5c6ca]/30 p-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[#191c1e]">No pudimos cargar tu historial.</p>
          <button
            type="button"
            onClick={loadFirstPage}
            className="shrink-0 px-4 h-9 rounded-full bg-black text-white text-[13px] font-bold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && sessions.length === 0 && (
        <div className="rounded-2xl bg-white border border-[#c5c6ca]/30 p-5 text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-[#45474a]">
            history
          </span>
          <p className="mt-1 text-[14px] font-semibold text-black">Aún no hay entrenamientos completados</p>
          <p className="mt-1 text-[13px] text-[#45474a]">
            Cuando finalices uno, aparecerá aquí con su resumen: volumen, duración y series de cada ejercicio.
          </p>
        </div>
      )}

      {status === 'ready' && sessions.length > 0 && (
        <>
          {openError && (
            <p role="alert" className="text-[13px] font-semibold text-[#93000a]">
              {openError}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => {
              const volume = formatVolume(s.total_volume_kg);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => open(s)}
                    disabled={openingId !== null}
                    aria-label={`Ver resumen de ${s.title}, ${formatDate(s.completed_at)}`}
                    className="w-full text-left rounded-2xl bg-white border border-[#c5c6ca]/30 px-4 py-3 flex items-center gap-3 hover:border-black transition-colors duration-150 disabled:cursor-wait cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-bold text-black truncate">{s.title}</span>
                        <span className="shrink-0 text-[12px] text-[#45474a] first-letter:uppercase">{formatDate(s.completed_at)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-[#45474a] tabular-nums">
                        {[s.duration_minutes != null ? `${s.duration_minutes} min` : null, volume].filter(Boolean).join(' · ') || 'Sin datos de duración'}
                      </p>
                    </div>
                    {openingId === s.id ? (
                      <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    ) : (
                      <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-[#45474a]">
                        chevron_right
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="self-center px-5 h-10 rounded-full bg-[#edeef0] text-black text-[13px] font-bold disabled:opacity-60 cursor-pointer"
            >
              {loadingMore ? 'Cargando…' : 'Ver más'}
            </button>
          )}
        </>
      )}
    </section>
  );
};
