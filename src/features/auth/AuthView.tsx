import React, { useId, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'sign_in' | 'sign_up' | 'verify';

// The product's own motif: a week strip with the Push/Pull/Legs rotation
// (3 days/week → Mon/Wed/Fri), the same L–D letters the dashboard uses.
const WEEK = [
  { d: 'L', s: 'Empuje' },
  { d: 'M' },
  { d: 'X', s: 'Tracción' },
  { d: 'J' },
  { d: 'V', s: 'Pierna' },
  { d: 'S' },
  { d: 'D' }
] as const;

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, hint, trailing, className = '', ...input }) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#45474a]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-describedby={hintId}
          className={`w-full h-12 px-4 ${trailing ? 'pr-12' : ''} bg-[#f3f4f6] rounded-2xl text-[15px] text-black placeholder:text-[#75777a] border border-transparent outline-none transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[#edeef0] focus:bg-white focus:border-black focus:shadow-[0_2px_10px_rgba(0,0,0,0.06)] aria-[invalid=true]:border-[#ba1a1a] ${className}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="text-[12px] text-[#45474a]">
          {hint}
        </p>
      )}
    </div>
  );
};

const Spinner = () => (
  <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
);

export const AuthView: React.FC = () => {
  const { signUp, signIn, verifyEmail, resendVerification } = useAuth();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (result.error) return setError(result.error);
    if (result.requireEmailVerification) {
      setInfo(null); // the verify heading already names the address
      setMode('verify');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email.trim(), password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await verifyEmail(email.trim(), otp);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const handleResend = async () => {
    setError(null);
    const result = await resendVerification(email.trim());
    setInfo(result.error ? null : 'Código reenviado. Revisa tu correo.');
    if (result.error) setError(result.error);
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={showPassword}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#45474a] hover:text-black hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-black cursor-pointer"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
    </button>
  );

  const submitLabel = {
    sign_in: busy ? 'Entrando…' : 'Entrar',
    sign_up: busy ? 'Creando cuenta…' : 'Crear cuenta',
    verify: busy ? 'Verificando…' : 'Verificar y entrar'
  }[mode];

  const heading = {
    sign_in: 'Bienvenido de vuelta',
    sign_up: 'Crea tu cuenta',
    verify: 'Revisa tu correo'
  }[mode];

  return (
    <div className="auth-shell min-h-screen w-full bg-black flex flex-col lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Statement: the one bold move — the rotation itself, set at full display strength */}
      <section className="relative flex flex-col justify-between gap-5 sm:gap-10 px-6 pt-6 pb-8 sm:pt-8 sm:pb-12 sm:px-10 lg:min-h-screen lg:px-14 lg:py-14 text-white">
        <div className="flex items-center gap-1.5">
          <span className="font-serif-hero text-[26px] tracking-tight">Future</span>
          <span className="px-2 py-0.5 rounded-md bg-white text-black text-[11px] font-bold">PRO</span>
        </div>

        <div>
          <h1 className="auth-title font-serif-hero font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(2.6rem,11vw,6rem)]">
            <span className="block">Empuje.</span>
            <span className="block">Tracción.</span>
            <span className="block text-white/60">Pierna.</span>
          </h1>
          <p className="hidden sm:block mt-6 max-w-[34ch] text-[15px] leading-relaxed text-white/70">
            Tu rutina de cada semana, generada a partir de lo que registras. Los ejercicios se mantienen; la carga sube
            cuando la ganas.
          </p>
        </div>

        <ol aria-label="Ejemplo de semana a 3 días" className="grid grid-cols-7 gap-1.5 max-w-md">
          {WEEK.map((day) => (
            <li key={day.d} className="flex flex-col items-center gap-2">
              <span
                className={`w-full h-10 sm:h-12 rounded-2xl flex items-center justify-center text-[13px] font-bold ${
                  's' in day ? 'bg-white text-black' : 'border border-white/20 text-white/60'
                }`}
              >
                {day.d}
              </span>
              {/* Sessions fall on alternate days, so the caption may spill into the empty neighbours. */}
              <span className="h-4 whitespace-nowrap text-[11px] font-semibold text-white/80">{'s' in day ? day.s : ''}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Form */}
      <section className="flex-1 bg-[#f8f9fb] rounded-t-[32px] lg:rounded-none px-6 pt-6 sm:pt-8 pb-12 sm:px-10 lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-sm mx-auto">
          {mode !== 'verify' && (
            <div role="tablist" aria-label="Acceso" className="grid grid-cols-2 p-1 mb-6 sm:mb-8 rounded-full bg-[#edeef0]">
              {(
                [
                  ['sign_in', 'Entrar'],
                  ['sign_up', 'Crear cuenta']
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`h-10 rounded-full text-[13px] font-bold transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                    mode === m ? 'bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-[#45474a] hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <h2 className="font-serif-hero text-[34px] leading-[40px] tracking-tight text-black">{heading}</h2>
          <p className="mt-1 mb-6 text-[14px] text-[#45474a]">
            {mode === 'sign_in' && 'Entra para ver tu plan de esta semana.'}
            {mode === 'sign_up' && 'Te pediremos tus datos de entrenamiento después.'}
            {mode === 'verify' && (
              <>
                Escribe el código de 6 dígitos que enviamos a
                <span className="block font-semibold text-black [overflow-wrap:anywhere]">{email.trim()}</span>
              </>
            )}
          </p>

          <div aria-live="assertive" className="empty:hidden mb-4">
            {error && (
              <div role="alert" className="flex gap-2 items-start px-4 py-3 rounded-2xl bg-[#ffdad6] text-[#93000a] text-[13px] font-semibold">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}
          </div>
          {info && !error && (
            <div role="status" className="flex gap-2 items-start mb-4 px-4 py-3 rounded-2xl bg-[#dde1ff] text-[#1d3fbd] text-[13px] font-semibold">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] shrink-0">mark_email_read</span>
              <span>{info}</span>
            </div>
          )}

          <form
            onSubmit={mode === 'sign_in' ? handleSignIn : mode === 'sign_up' ? handleSignUp : handleVerify}
            className="flex flex-col gap-4"
            aria-busy={busy}
          >
            {mode === 'sign_up' && (
              <Field label="Nombre" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            )}

            {mode !== 'verify' && (
              <>
                <Field
                  label="Correo"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                />
                <Field
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'sign_up' ? 6 : undefined}
                  autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                  hint={mode === 'sign_up' ? 'Mínimo 6 caracteres.' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  trailing={passwordToggle}
                />
              </>
            )}

            {mode === 'verify' && (
              <Field
                label="Código de verificación"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                title="Seis dígitos"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-[22px] font-bold tracking-[0.4em] tabular-nums"
                aria-invalid={!!error}
              />
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-12 rounded-full bg-black text-white text-[15px] font-bold flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 hover:bg-[#1a1c1e] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {busy && <Spinner />}
              {submitLabel}
            </button>
          </form>

          {mode === 'verify' && (
            <div className="mt-4 flex items-center justify-between text-[13px] font-semibold">
              <button type="button" onClick={() => switchMode('sign_up')} className="text-[#45474a] hover:text-black underline-offset-4 hover:underline cursor-pointer">
                Cambiar correo
              </button>
              <button type="button" onClick={handleResend} className="text-black underline underline-offset-4 cursor-pointer">
                Reenviar código
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
