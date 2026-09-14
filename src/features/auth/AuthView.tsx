import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type Mode = 'sign_in' | 'sign_up' | 'verify';

export const AuthView: React.FC = () => {
  const { signUp, signIn, verifyEmail, resendVerification } = useAuth();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signUp(email, password, name);
    setBusy(false);
    if (result.error) return setError(result.error);
    if (result.requireEmailVerification) {
      setInfo(`Enviamos un código a ${email}.`);
      setMode('verify');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await verifyEmail(email, otp);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const handleResend = async () => {
    setError(null);
    const result = await resendVerification(email);
    setInfo(result.error ? null : 'Código reenviado. Revisa tu correo.');
    if (result.error) setError(result.error);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-sm border border-[#c5c6ca]/20">
        <div className="text-center mb-6">
          <span className="font-serif-hero text-[28px] text-black tracking-tight">Future</span>
          <span className="ml-1 px-2 py-0.5 rounded-md bg-black text-white text-[11px] font-bold align-middle">PRO</span>
          <p className="text-xs text-[#45474a] font-medium mt-2">
            {mode === 'sign_in' && 'Entra para ver tu plan y tu progreso'}
            {mode === 'sign_up' && 'Crea tu cuenta para empezar'}
            {mode === 'verify' && 'Verifica tu correo'}
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] text-xs font-semibold">{error}</div>
        )}
        {info && !error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-[#274ed5]/10 text-[#274ed5] text-xs font-semibold">{info}</div>
        )}

        {mode === 'sign_in' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sign_up');
                setError(null);
                setInfo(null);
              }}
              className="w-full text-center text-xs text-[#45474a] font-semibold pt-1 cursor-pointer"
            >
              ¿No tienes cuenta? <span className="text-black underline">Regístrate</span>
            </button>
          </form>
        )}

        {mode === 'sign_up' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="email"
              required
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sign_in');
                setError(null);
                setInfo(null);
              }}
              className="w-full text-center text-xs text-[#45474a] font-semibold pt-1 cursor-pointer"
            >
              ¿Ya tienes cuenta? <span className="text-black underline">Entra</span>
            </button>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-3">
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="Código de 6 dígitos"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full h-11 px-4 bg-[#f3f4f6] rounded-full text-sm text-black text-center tracking-[0.3em] placeholder:text-[#75777a] outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-full bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Verificando…' : 'Verificar'}
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-center text-xs text-[#45474a] font-semibold pt-1 cursor-pointer"
            >
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
