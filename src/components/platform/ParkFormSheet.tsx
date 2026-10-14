import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParkLocale } from '@/contexts/park-locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { ParkFormSheetContext as SheetContext } from './park-form-sheet-context';
import { attachParkSheetDrag } from '@/lib/park-sheet-drag';

export function ParkFormSheet({ children, busy = false, ...props }: React.ComponentProps<typeof DialogPrimitive.Root> & { busy?: boolean }) {
  const { pt } = useParkLocale();
  const notifyOpenChange = props.onOpenChange;
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSavingState] = React.useState(false);
  const activeSaves = React.useRef(new Set<string>());
  const setSaving = React.useCallback((slot: string, active: boolean) => {
    if (active) activeSaves.current.add(slot); else activeSaves.current.delete(slot);
    setSavingState(activeSaves.current.size > 0);
  }, []);
  const [confirm, setConfirm] = React.useState(false);
  const markDirty = React.useCallback(() => setDirty(true), []);
  const markSaved = React.useCallback(() => setDirty(false), []);
  const onOpenChange = React.useCallback((open: boolean) => {
    if (!open && (busy || saving)) return false;
    if (!open && dirty) { setConfirm(true); return false; }
    setDirty(false); notifyOpenChange?.(open);
    return true;
  }, [busy, saving, dirty, notifyOpenChange]);
  const requestClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);
  const context = React.useMemo(() => ({ markDirty, markSaved, setSaving, requestClose, busy: busy || saving }), [markDirty, markSaved, setSaving, requestClose, busy, saving]);
  return <SheetContext.Provider value={context}>
    <DialogPrimitive.Root {...props} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{pt('Закрыть без сохранения?')}</AlertDialogTitle><AlertDialogDescription>{pt('Введённые изменения не сохранены. Можно продолжить заполнение или отказаться от них.')}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{pt('Продолжить заполнение')}</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirm(false); setDirty(false); props.onOpenChange?.(false); }}>{pt('Не сохранять')}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </SheetContext.Provider>;
}

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  header?: React.ReactNode; closeLabel?: string; closeButtonClassName?: string;
};

export const ParkFormSheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, ContentProps>(
  ({ children, header, className, closeLabel, closeButtonClassName, onChangeCapture, ...props }, forwardedRef) => {
    const { pt } = useParkLocale();
    const context = React.useContext(SheetContext);
    const requestClose = context?.requestClose;
    const gestureBusy = context?.busy;
    const returnFocus = React.useRef<HTMLElement | null>(null);
    const closeButton = React.useRef<HTMLButtonElement>(null);
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const mergeRef = React.useCallback((element: HTMLDivElement | null) => { setNode(element); if (typeof forwardedRef === 'function') forwardedRef(element); else if (forwardedRef) forwardedRef.current = element; }, [forwardedRef]);
    React.useEffect(() => {
      const handle = node?.querySelector<HTMLButtonElement>('[data-park-sheet-handle]');
      if (!node || !handle || gestureBusy) return;
      return attachParkSheetDrag(node, handle, () => requestClose?.() ?? false);
    }, [node, gestureBusy, requestClose]);
    React.useEffect(() => {
      const viewport = window.visualViewport;
      if (!viewport || !node) return;
      let frame = 0;
      const update = () => {
        const height = viewport.height;
        const bottom = Math.max(0, window.innerHeight - height - viewport.offsetTop);
        node.style.setProperty('--park-sheet-height', `${height * 0.9}px`);
        node.style.setProperty('--park-sheet-bottom', `${bottom}px`);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && node.contains(focused)) focused.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        });
      };
      update(); viewport.addEventListener('resize', update);
      return () => { viewport.removeEventListener('resize', update); cancelAnimationFrame(frame); };
    }, [node]);
    return <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="park-form-sheet-overlay fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content {...props} ref={mergeRef}
        onOpenAutoFocus={event => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; props.onOpenAutoFocus?.(event); }}
        onCloseAutoFocus={event => { props.onCloseAutoFocus?.(event); if (!event.defaultPrevented && returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus({ preventScroll: true }); } }}
        data-park-form-sheet="true" className={cn('park-form-sheet fixed z-50 flex flex-col overflow-hidden bg-white text-slate-900', className)}
        onChangeCapture={event => { if (!(event.target instanceof HTMLInputElement && event.target.type === 'file')) context?.markDirty(); onChangeCapture?.(event); }}>
        <button type="button" data-park-sheet-handle disabled={context?.busy} aria-label={closeLabel || pt('Закрыть')} onClick={() => closeButton.current?.click()} className="flex min-h-11 w-full shrink-0 touch-none items-center justify-center rounded-t-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-50 sm:hidden"><span aria-hidden="true" className="h-1 w-10 rounded-full bg-slate-400" /></button>
        {header && <div className="shrink-0 border-b border-slate-200 px-4 pb-5 pt-1 sm:px-6 sm:py-5 sm:pr-14">{header}</div>}
        <div data-park-sheet-body className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">{children}</div>
        <DialogPrimitive.Close ref={closeButton} disabled={context?.busy} className={cn('absolute right-2 top-2 size-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-50', closeButtonClassName, 'hidden sm:flex')} aria-label={closeLabel || pt('Закрыть')}><X aria-hidden="true" className="size-5" /></DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>;
  }
);
ParkFormSheetContent.displayName = 'ParkFormSheetContent';
