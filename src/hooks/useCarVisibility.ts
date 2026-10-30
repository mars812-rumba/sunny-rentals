import { useRef, useState } from 'react';

export async function saveCarVisibility(apiUrl: string, adminKey: string, id: string, available: boolean) {
  const response = await fetch(`${apiUrl}/api/admin/cars/${encodeURIComponent(id)}/visibility?key=${encodeURIComponent(adminKey)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ available }),
  });
  if (!response.ok) throw new Error('Не удалось изменить показ в витрине. Попробуйте ещё раз.');
  const saved = await response.json();
  if (saved.id !== id || saved.available !== available) throw new Error('Сервер не подтвердил изменение. Обновите список машин.');
  return saved;
}

export function useCarVisibility(options: {
  apiUrl: string;
  adminKey: string;
  onSaved: (car: { id: string; available: boolean; updated_at: string }) => void;
  refresh: () => Promise<void>;
}) {
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const toggle = async (id: string, available: boolean) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setPending(current => ({ ...current, [id]: true }));
    setError('');
    try {
      const saved = await saveCarVisibility(options.apiUrl, options.adminKey, id, available);
      options.onSaved(saved);
      await options.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Не удалось сохранить показ в витрине');
    } finally {
      inFlight.current.delete(id);
      setPending(current => ({ ...current, [id]: false }));
    }
  };
  return { toggle, pending, error };
}
