import { createContext, useContext, useEffect, useId } from 'react';

export const ParkFormSheetContext = createContext<{ markDirty: () => void; markSaved: () => void; requestClose: () => boolean; busy: boolean; setSaving: (slot: string, saving: boolean) => void } | null>(null);
export function useInsideParkFormSheet() { return Boolean(useContext(ParkFormSheetContext)); }
export function useParkFormSheetSaved() { return useContext(ParkFormSheetContext)?.markSaved; }
export function useParkFormSheetDirty() { return useContext(ParkFormSheetContext)?.markDirty; }
export function useParkFormSheetSaving(saving: boolean) {
  const slot = useId();
  const setSaving = useContext(ParkFormSheetContext)?.setSaving;
  useEffect(() => { setSaving?.(slot, saving); return () => setSaving?.(slot, false); }, [slot, saving, setSaving]);
}
