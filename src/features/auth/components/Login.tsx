import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';
import { V4StressTest } from './V4StressTest';
import { PraxisAtom, type PraxisAtomState } from './praxis-atom/PraxisAtom';
import './login-bureau.css';

// Procedural cog deprecated — replaced by <PraxisAtom> which uses the real
// signature-atom geometry from praxis-web/public/assets/signature-atom-animated.svg
// and adds state-aware behavior (BOOT, IDLE, LOADING, SUCCESS, ERROR,
// REDUCED-MOTION). The atom is the only place motion is permitted in V4
// Bureau; it does the system's motion work so everywhere else stays still.

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn } = useAuth();

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  // Design-test routes — render stress-test surfaces when ?v4test=... is set.
  // Lets us evaluate V4 Bureau on dense list and worker tablet without
  // authenticating against a real Supabase user.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const test = params.get('v4test');
    if (test === 'sales' || test === 'pin') {
      return <V4StressTest mode={test} />;
    }
  }

  // Atom state mirrors the auth lifecycle. Mounts in BOOT (auto-transitions
  // to IDLE after 1.4s), goes LOADING during signIn, flashes SUCCESS on
  // success or ERROR on failure, then settles back to IDLE.
  const [atomState, setAtomState] = useState<PraxisAtomState>('boot');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setAtomState('loading');
    try {
      await signIn(email, password);
      setAtomState('success');
      // brief success flash before redirect
      window.setTimeout(() => setAtomState('idle'), 320);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setAtomState('error');
      window.setTimeout(() => setAtomState('idle'), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bureau-login">
      <div className="serial-plate">
        <div className="serial-stamp">
          <span className="serial">FIG. 00</span>
          <span className="sep">·</span>
          <span>AUTHENTICATION</span>
          <span className="sep">·</span>
          <span>CULTIVO · CULT CANNABIS</span>
        </div>
        <div className="serial-status">
          <span className="dot" />
          <span>SYSTEM LIVE</span>
        </div>
      </div>

      <div className="login-stack">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <PraxisAtom state={atomState} size={64} />
        </div>

        <div className="login-mark">
          CULTIVO<span className="period" />
        </div>
        <div className="login-tagline">
          Cultivation<span className="tag-sep">·</span>Operations<span className="tag-sep">·</span>Built by Praxis
        </div>

        <div className="login-fig">
          <span className="serial">FIG. 01</span>
          <span className="sep">·</span>
          <span>SIGN IN</span>
          <span className="sep">·</span>
          <span>OPERATOR ACCESS</span>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-row">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email">Email</label>
            <div className="field">
              <Mail />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="row-between">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="forgot"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot
              </button>
            </div>
            <div className="field">
              <Lock />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit">
            {loading ? 'SIGNING IN…' : 'SIGN IN →'}
          </button>
        </form>

        <div className="login-footer">
          Contact your administrator for access
        </div>
      </div>

      <div className="bottom-plate">
        <span>PRAXIS · CULTIVO V4</span>
        <span>SHEET 01 / 01</span>
      </div>

      {/* Atom-state preview rail — demo only, not shipped.
          Lets us evaluate every state side-by-side on a single page. */}
      <AtomStateRail />
    </div>
  );
}

function AtomStateRail() {
  const states: { label: string; state: PraxisAtomState }[] = [
    { label: 'BOOT', state: 'boot' },
    { label: 'IDLE', state: 'idle' },
    { label: 'LOADING', state: 'loading' },
    { label: 'SUCCESS', state: 'success' },
    { label: 'ERROR', state: 'error' },
    { label: 'REDUCED', state: 'reduced-motion' },
  ];
  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 56,
        padding: '14px 16px',
        background: 'rgba(6,26,51,0.78)',
        backdropFilter: 'blur(14px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
        border: '1px solid rgba(201,162,75,0.32)',
        boxShadow: 'inset 0 1px 0 rgba(241,232,210,0.06)',
        display: 'flex',
        gap: 18,
        alignItems: 'center',
        zIndex: 5,
      }}
      aria-label="Praxis Atom — design test rail"
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: 'rgba(241,232,210,0.55)',
        marginRight: 4,
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
      }}>FIG.A · ATOM</div>
      {states.map((s) => (
        <RailCell key={s.state} label={s.label} state={s.state} />
      ))}
    </div>
  );
}

function RailCell({ label, state }: { label: string; state: PraxisAtomState }) {
  // Each cell remounts the atom on click so BOOT can be re-triggered, and
  // SUCCESS / ERROR one-shots replay cleanly when re-entered.
  const [tick, setTick] = useState(0);
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
      onClick={() => setTick((t) => t + 1)}
      title={`Click to replay ${label.toLowerCase()}`}
    >
      <PraxisAtom key={`${state}-${tick}`} state={state} size={36} bootDuration={state === 'boot' ? 1400 : 0} />
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'rgba(241,232,210,0.55)',
      }}>{label}</div>
    </div>
  );
}
