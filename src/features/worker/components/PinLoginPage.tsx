import { useState, useCallback, useEffect } from 'react';
import { useWorkerAuth } from '../hooks/useWorkerAuth';
import { PraxisAtom, type PraxisAtomState } from '@/features/auth/components/praxis-atom/PraxisAtom';
import '@/features/auth/components/bureau-v4-stress.css';

const PIN_LENGTH = 4;

export function PinLoginPage() {
  const { loginWithPin, error: authError } = useWorkerAuth();
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [atomState, setAtomState] = useState<PraxisAtomState>('boot');

  const error = localError || authError;

  // Mirror auth lifecycle in atom: boot on mount, settle to idle, loading on
  // submit, success / error on resolve. Same contract as Tier 1 Login.
  useEffect(() => {
    const t = setTimeout(() => setAtomState('idle'), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (error) setAtomState('error');
  }, [error]);

  const handleBackspace = useCallback(() => {
    if (confirming) return;
    setLocalError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [confirming]);

  const handleSubmit = useCallback(async () => {
    if (pin.length < PIN_LENGTH || confirming) return;
    setConfirming(true);
    setLocalError(null);
    setAtomState('loading');
    try {
      const worker = await loginWithPin(pin);
      setStaffName(worker.first_name);
      setAtomState('success');
    } catch (err: unknown) {
      setPin('');
      setLocalError(err instanceof Error ? err.message : 'Login failed');
      setAtomState('error');
      setConfirming(false);
    }
  }, [pin, confirming, loginWithPin]);

  const handleDigitWithAutoSubmit = useCallback((digit: string) => {
    if (confirming) return;
    setLocalError(null);
    setPin((prev) => {
      const next = prev.length >= 6 ? prev : prev + digit;
      if (next.length >= PIN_LENGTH && !confirming) {
        setTimeout(() => {
          setAtomState('loading');
          loginWithPin(next).then((worker) => {
            setStaffName(worker.first_name);
            setAtomState('success');
          }).catch((err: unknown) => {
            setPin('');
            setLocalError(err instanceof Error ? err.message : 'Login failed');
            setAtomState('error');
            setConfirming(false);
          });
          setConfirming(true);
        }, 150);
      }
      return next;
    });
  }, [confirming, loginWithPin]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  if (staffName && confirming) {
    return (
      <div className="bureau-v4 bureau-v4-tablet">
        <div className="bv4-pin-stack">
          <PraxisAtom size={48} state="success" ariaLabel="Authenticated" />
          <div className="bv4-pin-mark">
            CULTIVO<span className="period" />
          </div>
          <div className="bv4-pin-tag">WELCOME, {staffName.toUpperCase()}</div>
          <div className="bv4-pin-foot">LOADING YOUR TASKS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bureau-v4 bureau-v4-tablet">
      <div className="bv4-pin-stack">
        <PraxisAtom size={48} state={atomState} ariaLabel="Worker login" />
        <div className="bv4-pin-mark">
          CULTIVO<span className="period" />
        </div>
        <div className="bv4-pin-tag">WORKER · PIN ACCESS</div>

        <div className="bv4-pin-fig">
          <span className="serial">FIG. 03</span>
          <span className="sep">·</span>
          <span>FLOOR LOGIN</span>
          <span className="sep">·</span>
          <span>4-DIGIT PIN</span>
        </div>

        <div className="bv4-pin-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`bv4-pin-dot ${i < pin.length ? 'is-filled' : ''}`}
              style={{ opacity: i < PIN_LENGTH ? 1 : 0.4 }}
            />
          ))}
        </div>

        {error && (
          <div className="bv4-status-bad" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {error}
          </div>
        )}

        <div className="bv4-numpad">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'back') {
              return (
                <button key={i} onClick={handleBackspace} className="bv4-numkey is-back" disabled={confirming} aria-label="Backspace">
                  &#9003;
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigitWithAutoSubmit(d)}
                disabled={confirming}
                className="bv4-numkey"
              >
                {d}
              </button>
            );
          })}
        </div>

        {pin.length >= PIN_LENGTH && !confirming && (
          <button
            onClick={handleSubmit}
            className="bv4-numkey"
            style={{ width: '100%', height: 48, color: 'var(--pv4-gold)', borderColor: 'var(--pv4-gold)' }}
          >
            SIGN IN →
          </button>
        )}

        <div className="bv4-pin-foot">FORGOT YOUR PIN? ASK YOUR MANAGER</div>
      </div>
    </div>
  );
}
