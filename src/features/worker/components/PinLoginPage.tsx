import { useState, useCallback } from 'react';
import { useWorkerAuth } from '../hooks/useWorkerAuth';

const PIN_LENGTH = 4;

export function PinLoginPage() {
  const { loginWithPin, error: authError } = useWorkerAuth();
  const [pin, setPin] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError || authError;

  const handleDigit = useCallback((digit: string) => {
    if (confirming) return;
    setLocalError(null);
    setPin((prev) => {
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  }, [confirming]);

  const handleBackspace = useCallback(() => {
    if (confirming) return;
    setLocalError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [confirming]);

  const handleSubmit = useCallback(async () => {
    if (pin.length < PIN_LENGTH || confirming) return;
    setConfirming(true);
    setLocalError(null);
    try {
      const worker = await loginWithPin(pin);
      setStaffName(worker.first_name);
      // WorkerAuthProvider will update context, parent will detect and redirect
    } catch (err: unknown) {
      setPin('');
      setLocalError(err instanceof Error ? err.message : 'Login failed');
      setConfirming(false);
    }
  }, [pin, confirming, loginWithPin]);

  // Auto-submit when PIN reaches expected length
  const handleDigitWithAutoSubmit = useCallback((digit: string) => {
    if (confirming) return;
    setLocalError(null);
    setPin((prev) => {
      const next = prev.length >= 6 ? prev : prev + digit;
      if (next.length >= PIN_LENGTH && !confirming) {
        // Defer submit to next tick so state updates
        setTimeout(() => {
          loginWithPin(next).then((worker) => {
            setStaffName(worker.first_name);
          }).catch((err: unknown) => {
            setPin('');
            setLocalError(err instanceof Error ? err.message : 'Login failed');
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
      <div className="min-h-screen bg-cult-black flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-cult-white uppercase tracking-wider mb-2">
            Welcome, {staffName}
          </div>
          <p className="text-cult-light-gray text-sm">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cult-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-cult-white uppercase tracking-widest">
            Cult Ops
          </h1>
          <p className="text-cult-medium-gray text-sm mt-1 uppercase tracking-wider">
            Worker Login
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? 'bg-cult-white border-cult-white'
                  : i < PIN_LENGTH
                    ? 'border-cult-medium-gray'
                    : 'border-cult-dark-gray'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'back') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="h-16 flex items-center justify-center text-cult-medium-gray hover:text-cult-white transition-colors text-lg"
                >
                  &#9003;
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigitWithAutoSubmit(d)}
                disabled={confirming}
                className="h-16 bg-cult-near-black border border-cult-medium-gray text-cult-white text-2xl font-bold rounded-lg hover:bg-cult-dark-gray hover:border-cult-lighter-gray active:bg-cult-medium-gray transition-all disabled:opacity-40"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Manual submit for longer PINs */}
        {pin.length >= PIN_LENGTH && !confirming && (
          <button
            onClick={handleSubmit}
            className="w-full mt-4 py-3 bg-cult-white text-cult-black font-bold uppercase tracking-wider text-sm hover:bg-cult-light-gray transition-colors"
          >
            Sign In
          </button>
        )}

        <p className="text-center text-cult-dark-gray text-xs mt-8">
          Forgot your PIN? Ask your manager.
        </p>
      </div>
    </div>
  );
}
