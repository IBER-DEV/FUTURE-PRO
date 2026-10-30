// Durable, idempotent logging of workout sessions/sets to the backend.
// Pure logic with injected dependencies (db, storage, user id) so it can be
// tested in node without the InsForge client.

export interface SetRow {
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  setType: string;
}

export interface SessionClose {
  durationMinutes: number;
  totalVolumeKg: number;
}

// All methods throw on backend error.
export interface LoggerDb {
  createSession(userId: string, title: string): Promise<string>;
  findSet(sessionId: string, exerciseId: string, setNumber: number): Promise<{ id: string } | null>;
  insertSet(sessionId: string, row: SetRow, completedAt: string): Promise<void>;
  updateSet(rowId: string, row: SetRow, completedAt: string): Promise<void>;
  closeSession(sessionId: string, completedAt: string, close: SessionClose): Promise<void>;
}

export interface LoggerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoggerDeps {
  db: LoggerDb;
  storage: LoggerStorage;
  getUserId: () => Promise<string | null>;
  now?: () => string;
  keys?: { sessions: string; pending: string };
}

type PendingItem =
  // completedAt is captured when the set was logged, not when a retry succeeds,
  // so a set retried days later still belongs to its original session/day.
  | { kind: 'set'; workoutId: string; title: string; row: SetRow; completedAt?: string }
  | { kind: 'close'; workoutId: string; completedAt: string; close: SessionClose };

const DEFAULT_KEYS = { sessions: 'futurepro_session_ids', pending: 'futurepro_pending_writes' };

export class SessionLogger {
  private sessionIds: Record<string, string> = {};
  private pending: PendingItem[] = [];
  private inflight = new Map<string, Promise<string>>();
  private chain: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private keys: { sessions: string; pending: string };
  private now: () => string;

  constructor(private deps: LoggerDeps) {
    this.keys = deps.keys ?? DEFAULT_KEYS;
    this.now = deps.now ?? (() => new Date().toISOString());
    this.sessionIds = this.load(this.keys.sessions, {});
    this.pending = this.load(this.keys.pending, []);
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const raw = this.deps.storage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private persist() {
    try {
      this.deps.storage.setItem(this.keys.sessions, JSON.stringify(this.sessionIds));
      this.deps.storage.setItem(this.keys.pending, JSON.stringify(this.pending));
    } catch (e) {
      console.error('[sessionLogger] no se pudo persistir el estado', e);
    }
  }

  getSessionId(workoutId: string): string | undefined {
    return this.sessionIds[workoutId];
  }

  getPendingCount(): number {
    return this.pending.length;
  }

  // Memoized per workout: the promise is stored synchronously, before any await.
  private ensureSession(workoutId: string, title: string): Promise<string> {
    const known = this.sessionIds[workoutId];
    if (known) return Promise.resolve(known);
    const running = this.inflight.get(workoutId);
    if (running) return running;

    const gen = this.generation;
    const p = (async () => {
      const userId = await this.deps.getUserId();
      if (!userId) throw new Error('sin usuario autenticado');
      const id = await this.deps.db.createSession(userId, title);
      if (gen === this.generation) {
        this.sessionIds[workoutId] = id;
        this.persist();
      }
      return id;
    })();
    this.inflight.set(workoutId, p);
    const clear = () => {
      if (this.inflight.get(workoutId) === p) this.inflight.delete(workoutId);
    };
    p.then(clear, clear); // failure also clears, so later saves retry
    return p;
  }

  // select existing (session, exercise, set_number) -> update, else insert.
  private async writeSet(workoutId: string, title: string, row: SetRow, completedAt: string): Promise<void> {
    const sessionId = await this.ensureSession(workoutId, title);
    const existing = await this.deps.db.findSet(sessionId, row.exerciseId, row.setNumber);
    if (existing) await this.deps.db.updateSet(existing.id, row, completedAt);
    else await this.deps.db.insertSet(sessionId, row, completedAt);
  }

  private async writeClose(workoutId: string, completedAt: string, close: SessionClose): Promise<void> {
    const sessionId = this.sessionIds[workoutId] ?? (await this.inflight.get(workoutId));
    if (!sessionId) return; // nothing was ever logged for this workout
    await this.deps.db.closeSession(sessionId, completedAt, close);
    if (this.sessionIds[workoutId] === sessionId) {
      delete this.sessionIds[workoutId];
      this.persist();
    }
  }

  private enqueue(item: PendingItem) {
    this.pending = this.pending.filter((p) => {
      if (p.kind !== item.kind || p.workoutId !== item.workoutId) return true;
      if (p.kind === 'set' && item.kind === 'set') {
        return !(p.row.exerciseId === item.row.exerciseId && p.row.setNumber === item.row.setNumber);
      }
      return false;
    });
    this.pending.push(item);
    this.persist();
  }

  private async flushPending(): Promise<void> {
    const items = this.pending;
    this.pending = [];
    for (const item of items) {
      try {
        if (item.kind === 'set') await this.writeSet(item.workoutId, item.title, item.row, item.completedAt ?? this.now());
        else await this.writeClose(item.workoutId, item.completedAt, item.close);
      } catch (e) {
        console.error('[sessionLogger] reintento fallido', e);
        this.enqueue(item);
      }
    }
    this.persist();
  }

  private run<T>(op: () => Promise<T>): Promise<T> {
    const next = this.chain.then(op, op);
    this.chain = next.catch(() => undefined);
    return next;
  }

  // Never throws: failures are logged and queued for the next save/complete.
  saveSet(workoutId: string, title: string, row: SetRow): Promise<void> {
    const completedAt = this.now();
    return this.run(async () => {
      await this.flushPending();
      try {
        await this.writeSet(workoutId, title, row, completedAt);
      } catch (e) {
        console.error('[sessionLogger] no se pudo guardar la serie', e);
        this.enqueue({ kind: 'set', workoutId, title, row, completedAt });
      }
    });
  }

  // Waits for every earlier write, then closes the session. Returns false (and
  // queues a retry, keeping the session id) if the backend rejected it.
  complete(workoutId: string, close: SessionClose, completedAt: string = this.now()): Promise<boolean> {
    return this.run(async () => {
      await this.flushPending();
      try {
        await this.writeClose(workoutId, completedAt, close);
        return !this.pending.some((p) => p.workoutId === workoutId);
      } catch (e) {
        console.error('[sessionLogger] no se pudo cerrar la sesión', e);
        this.enqueue({ kind: 'close', workoutId, completedAt, close });
        return false;
      }
    });
  }

  // Sign-out / user change: drop everything from memory and storage.
  clear(): void {
    this.generation++;
    this.sessionIds = {};
    this.pending = [];
    this.inflight.clear();
    this.chain = Promise.resolve();
    try {
      this.deps.storage.removeItem(this.keys.sessions);
      this.deps.storage.removeItem(this.keys.pending);
    } catch {
      // nothing to wipe
    }
  }
}
