import { useRef } from 'react';
import { ChevronDown, Eye, EyeOff, FileText, Pencil, Trash2, WalletCards, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function FleetPhotoActions({ name, busy, onEdit, onArchive }: { name: string; busy: boolean; onEdit: () => void; onArchive: () => void }) {
  return <div className="absolute right-2 top-2 flex gap-2">
    <Button type="button" variant="outline" className="size-11 bg-white p-0 text-slate-900 hover:bg-slate-100" disabled={busy} aria-label={`Редактировать ${name}`} onClick={onEdit}><Pencil aria-hidden="true" className="size-4" /></Button>
    <Button type="button" variant="outline" className="size-11 bg-white p-0 text-red-700 hover:bg-red-50" disabled={busy} aria-label={`В архив: ${name}`} onClick={onArchive}><Trash2 aria-hidden="true" className="size-4" /></Button>
  </div>;
}

export function FleetCardActions({ name, busy, visible, onDetails, onVisibility }: {
  name: string; busy: boolean; visible: boolean;
  onDetails: (section: 'pricing' | 'specs' | 'description', trigger: HTMLButtonElement) => void; onVisibility: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  return <DropdownMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="outline" disabled={busy} className="min-h-11 w-full justify-between gap-2" aria-label={`Действия: ${name}`}>Действия<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-2rem)] bg-white text-slate-900" onCloseAutoFocus={event => { if (openingDialog.current) { event.preventDefault(); openingDialog.current = false; } }}>
      {([['pricing', 'Цены', WalletCards], ['specs', 'Характеристики', Wrench], ['description', 'Описание', FileText]] as const).map(([section, label, Icon]) => <DropdownMenuItem key={section} disabled={busy} className="min-h-11 gap-2" onSelect={() => { if (trigger.current) { openingDialog.current = true; onDetails(section, trigger.current); } }}><Icon aria-hidden="true" className="size-4" />{label}</DropdownMenuItem>)}
      <DropdownMenuSeparator /><DropdownMenuItem disabled={busy} className="min-h-11 gap-2" onSelect={onVisibility}>{visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}{visible ? 'Скрыть с витрины' : 'Показать на витрине'}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
