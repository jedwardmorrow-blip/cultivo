import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseUnsavedChangesResult {
  /**
   * Call when the user attempts to close the drawer/panel.
   * Resolves to true if it's safe to close (not dirty, or user confirmed discard).
   * Resolves to false if the user chose to keep editing.
   */
  confirmClose: () => Promise<boolean>;
  /** True when the confirm dialog should be rendered. */
  showConfirm: boolean;
  /** Called when the user clicks "Discard" — resolves confirmClose() to true. */
  onDiscard: () => void;
  /** Called when the user clicks "Keep Editing" — resolves confirmClose() to false. */
  onKeepEditing: () => void;
}

/**
 * CUL-345 / DS-5: Dirty-state protection for drawers, forms, and any component
 * that needs to guard against accidental close with unsaved changes.
 *
 * Usage:
 * ```tsx
 * const { confirmClose, showConfirm, onDiscard, onKeepEditing } = useUnsavedChanges(form.formState.isDirty);
 *
 * async function handleClose() {
 *   const ok = await confirmClose();
 *   if (ok) onClose();
 * }
 *
 * return (
 *   <>
 *     <Drawer onClose={handleClose}>...</Drawer>
 *     {showConfirm && <ConfirmDiscardDialog onDiscard={onDiscard} onKeepEditing={onKeepEditing} />}
 *   </>
 * );
 * ```
 *
 * Also installs a `beforeunload` listener while `isDirty` is true, so browser
 * tab close / navigation attempts get the native "unsaved changes" prompt.
 */
export function useUnsavedChanges(isDirty: boolean): UseUnsavedChangesResult {
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingResolveRef = useRef<((ok: boolean) => void) | null>(null);

  // Native beforeunload guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for Chrome
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmClose = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      pendingResolveRef.current = resolve;
      setShowConfirm(true);
    });
  }, [isDirty]);

  const onDiscard = useCallback(() => {
    setShowConfirm(false);
    pendingResolveRef.current?.(true);
    pendingResolveRef.current = null;
  }, []);

  const onKeepEditing = useCallback(() => {
    setShowConfirm(false);
    pendingResolveRef.current?.(false);
    pendingResolveRef.current = null;
  }, []);

  return { confirmClose, showConfirm, onDiscard, onKeepEditing };
}
