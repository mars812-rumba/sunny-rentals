import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { useEffect, useState } from 'react';
import { CarFront } from 'lucide-react';
import { loadPlatformMedia } from '@/api/platform-admin';
import { loadOwnerMedia } from '@/api/park-owner-fleet';

// Private media stays in its tenant context; never use legacy Sunny image paths.
export function ParkCalendarPhoto({ tenantId, reference, admin }: { tenantId: string; reference?: string; admin: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setFailed(false);
    if (reference) {
      (admin ? loadPlatformMedia : loadOwnerMedia)(tenantId, reference, controller.signal)
        .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
        .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [tenantId, reference, admin]);
  return url && !failed
    ? <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
    : <div className="grid h-full w-full place-items-center" title={reference ? failed ? pt("Фото недоступно") : pt("Загружаем фото") : pt("Фото пока нет")}><CarFront aria-hidden="true" className="h-4 w-4 text-slate-500" /></div>;
}
