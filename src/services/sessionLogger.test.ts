import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionLogger, LoggerDb, LoggerStorage, SetRow } from './sessionLogger';

const memStorage = (): LoggerStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fakeDb(opts: { delay?: number } = {}) {
  const state = {
    sessions: [] as { id: string; closed?: unknown }[],
    sets: [] as { id: string; sessionId: string; row: SetRow; completedAt?: string }[],
    failSets: 0,
    failClose: 0,
    sessionInserts: 0
  };
  const db: LoggerDb = {
    async createSession() {
      state.sessionInserts++;
      await wait(opts.delay ?? 0);
      const id = `sess${state.sessions.length + 1}`;
      state.sessions.push({ id });
      return id;
    },
    async findSet(sessionId, exerciseId, setNumber) {
      await wait(opts.delay ?? 0);
      const f = state.sets.find(
        (s) => s.sessionId === sessionId && s.row.exerciseId === exerciseId && s.row.setNumber === setNumber
      );
      return f ? { id: f.id } : null;
    },
    async insertSet(sessionId, row, completedAt) {
      await wait(opts.delay ?? 0);
      if (state.failSets > 0) {
        state.failSets--;
        throw new Error('boom');
      }
      state.sets.push({ id: `set${state.sets.length + 1}`, sessionId, row, completedAt });
    },
    async updateSet(rowId, row) {
      const s = state.sets.find((x) => x.id === rowId)!;
      s.row = row;
    },
    async closeSession(sessionId, completedAt, close) {
      if (state.failClose > 0) {
        state.failClose--;
        throw new Error('close boom');
      }
      state.sessions.find((s) => s.id === sessionId)!.closed = { completedAt, ...close };
    }
  };
  return { db, state };
}

const row = (n: number, weight = 50, ex = 'ex1'): SetRow => ({
  exerciseId: ex,
  exerciseName: 'Bench',
  setNumber: n,
  weightKg: weight,
  reps: 8,
  rir: 2,
  setType: 'normal'
});
const mk = (db: LoggerDb, storage = memStorage()) => new SessionLogger({ db, storage, getUserId: async () => 'u1' });

async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const orig = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = orig;
  }
}

test('D-02: guardados concurrentes crean una sola sesion', async () => {
  const { db, state } = fakeDb({ delay: 5 });
  const l = mk(db);
  await Promise.all([l.saveSet('w1', 'Push', row(1)), l.saveSet('w1', 'Push', row(2)), l.saveSet('w1', 'Push', row(3))]);
  assert.equal(state.sessionInserts, 1);
  assert.equal(state.sets.length, 3);
});

test('D-04: la misma serie guardada dos veces deja 1 fila con los ultimos valores', async () => {
  const { db, state } = fakeDb({ delay: 2 });
  const l = mk(db);
  await Promise.all([l.saveSet('w1', 'Push', row(1, 50)), l.saveSet('w1', 'Push', row(1, 55))]);
  assert.equal(state.sets.length, 1);
  assert.equal(state.sets[0].row.weightKg, 55);
});

test('D-03: tras recargar (nueva instancia, mismo storage) se reutiliza la sesion', async () => {
  const { db, state } = fakeDb();
  const storage = memStorage();
  await mk(db, storage).saveSet('w1', 'Push', row(1));
  const reloaded = mk(db, storage);
  assert.equal(reloaded.getSessionId('w1'), 'sess1');
  await reloaded.saveSet('w1', 'Push', row(2));
  assert.equal(state.sessionInserts, 1);
  assert.equal(state.sets.length, 2);
  assert.equal(await reloaded.complete('w1', { durationMinutes: 30, totalVolumeKg: 800 }), true);
  assert.ok(state.sessions[0].closed);
});

test('D-04: una escritura fallida se encola, se persiste y se reintenta', async () => {
  const { db, state } = fakeDb();
  const storage = memStorage();
  const l = mk(db, storage);
  state.failSets = 1;
  await quiet(() => l.saveSet('w1', 'Push', row(1)));
  assert.equal(state.sets.length, 0);
  assert.equal(l.getPendingCount(), 1);
  const reloaded = mk(db, storage);
  assert.equal(reloaded.getPendingCount(), 1);
  await reloaded.saveSet('w1', 'Push', row(2));
  assert.equal(reloaded.getPendingCount(), 0);
  assert.equal(state.sets.length, 2);
  assert.equal(state.sessionInserts, 1);
});

test('D-02: si falla crear la sesion, un guardado posterior reintenta', async () => {
  const { db, state } = fakeDb();
  let fail = true;
  const flaky: LoggerDb = {
    ...db,
    createSession: async (u, t) => {
      if (fail) throw new Error('down');
      return db.createSession(u, t);
    }
  };
  const l = mk(flaky);
  await quiet(() => l.saveSet('w1', 'Push', row(1)));
  fail = false;
  await l.saveSet('w1', 'Push', row(2));
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sets.length, 2);
});

test('D-03: complete espera escrituras, cierra la sesion, reintenta si falla y es idempotente', async () => {
  const { db, state } = fakeDb({ delay: 3 });
  const l = mk(db);
  void l.saveSet('w1', 'Push', row(1)); // not awaited: complete must wait for it
  state.failClose = 1;
  const first = await quiet(() => l.complete('w1', { durationMinutes: 20, totalVolumeKg: 400 }));
  assert.equal(first, false);
  assert.equal(l.getSessionId('w1'), 'sess1'); // id kept for retry
  assert.equal(state.sets.length, 1);
  assert.equal(await l.complete('w1', { durationMinutes: 20, totalVolumeKg: 400 }), true);
  assert.ok(state.sessions[0].closed);
  assert.equal(l.getSessionId('w1'), undefined);
  assert.equal(await l.complete('w1', { durationMinutes: 20, totalVolumeKg: 400 }), true); // no-op
  assert.equal(state.sessions.length, 1);
});

test('D-01: clear borra sesiones y cola', async () => {
  const { db } = fakeDb();
  const storage = memStorage();
  const l = mk(db, storage);
  await l.saveSet('w1', 'Push', row(1));
  l.clear();
  assert.equal(l.getSessionId('w1'), undefined);
  assert.equal(mk(db, storage).getSessionId('w1'), undefined);
});

test('D-21: una serie reintentada conserva la hora en que se registro, no la del reintento', async () => {
  const { db, state } = fakeDb();
  let clock = '2026-10-27T23:40:00.000Z';
  const l = new SessionLogger({ db, storage: memStorage(), getUserId: async () => 'u1', now: () => clock });
  state.failSets = 1;
  await quiet(() => l.saveSet('w1', 'Push', row(1)));
  clock = '2026-10-30T18:00:00.000Z'; // next save, days later
  await l.saveSet('w2', 'Pull', row(1, 40, 'ex2'));
  const retried = state.sets.find((x) => x.row.exerciseId === 'ex1')!;
  assert.equal(retried.completedAt, '2026-10-27T23:40:00.000Z');
});
