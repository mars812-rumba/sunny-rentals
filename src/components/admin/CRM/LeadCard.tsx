import { Lead, LeadMarker } from '@/types/crm';
import { cn } from '@/lib/utils';
import {
  Info, Calendar, MapPin, MessageSquare, Send, Archive, UserCheck,
  CirclePlus, CircleDollarSign, CircleMinus, CircleCheckBig,
  Paperclip, StickyNote
} from 'lucide-react';

interface LeadCardProps {
  user: Lead;
  editingNoteId: string | null;
  tempNote: string;
  onEditNote: (userId: string, note: string) => void;
  onSaveNote: (userId: string) => void;
  onTempNoteChange: (val: string) => void;
  onOpenDetails: (user: Lead) => void;
  onOpenChat: (user: Lead) => void;
  onStatusChange: (userId: string, status: string) => void;
  onArchive: (userId: string) => void;
  onMarkerChange: (userId: string, marker: LeadMarker) => void;
}

const LeadCard = ({
  user, editingNoteId, tempNote,
  onEditNote, onSaveNote, onTempNoteChange,
  onOpenDetails, onOpenChat, onStatusChange, onArchive, onMarkerChange
}: LeadCardProps) => {
  const currentStatus = user.final_status || user.status;
  const dialog = user.dialog_status;
  const needsReply = dialog?.last_message_from === 'user';
  const aiActive = dialog?.claude_status === 'active';

  const days = (() => {
    if (!user.dates_selected?.start || !user.dates_selected?.end) return 0;
    const d = (new Date(user.dates_selected.end).getTime() - new Date(user.dates_selected.start).getTime()) / 86400000;
    return Math.max(0, Math.round(d));
  })();

  const formatDate = (d?: string) => {
    if (!d) return '??';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Left border color based on marker or status
  const borderColor = (() => {
    if (user.marker === 'unprocessed') return 'border-l-blue-500';
    if (user.marker === 'in_progress') return 'border-l-green-500';
    if (user.marker === 'ready') return 'border-l-emerald-500';
    if (user.marker === 'rejected') return 'border-l-red-400';
    if (needsReply) return 'border-l-amber-400';
    return 'border-l-transparent';
  })();

  const bgClass = needsReply && !user.marker ? 'bg-amber-50/40' : 'bg-card';

  const markerButtons = [
    { id: 'unprocessed' as const, icon: CirclePlus, activeClass: 'text-blue-600 bg-blue-50' },
    { id: 'in_progress' as const, icon: CircleDollarSign, activeClass: 'text-green-600 bg-green-50' },
    { id: 'rejected' as const, icon: CircleMinus, activeClass: 'text-red-600 bg-red-50' },
    { id: 'ready' as const, icon: CircleCheckBig, activeClass: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className={cn(
      'border border-l-[3px] rounded-md transition-all',
      borderColor, bgClass, 'border-border'
    )}>
      <div className="px-2 py-1.5 space-y-1">
        {/* Row 1: Car + Username */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {user.car_interested || 'не выбрано'}
            </span>
            {user.category_interested && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {user.category_interested}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">@{user.username}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenDetails(user); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Info size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Dates + Meta */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Calendar size={10} />
              {formatDate(user.dates_selected?.start)}-{formatDate(user.dates_selected?.end)}
              <span className="font-semibold text-foreground ml-0.5">{days}D</span>
            </span>
            <span className="flex items-center gap-0.5">
              <MapPin size={10} />
              {user.pickup_location || 'Пхукет'}
            </span>
          </div>
          <span className="text-[9px]">
            ID: {String(user.user_id).startsWith('web_session') ? 'Web' : user.user_id}
          </span>
        </div>

        {/* Row 3: Note */}
        <div
          className="flex items-center gap-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onEditNote(user.user_id, user.last_note || '');
          }}
        >
          <StickyNote size={10} className="text-muted-foreground shrink-0" />
          {editingNoteId === user.user_id ? (
            <input
              autoFocus
              className="flex-1 text-[10px] bg-transparent border-b border-input outline-none py-0.5 text-foreground"
              value={tempNote}
              onChange={(e) => onTempNoteChange(e.target.value)}
              onBlur={() => onSaveNote(user.user_id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveNote(user.user_id)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={cn('text-[10px] truncate', user.last_note ? 'text-foreground' : 'text-muted-foreground/50')}>
              {user.last_note || 'Добавить заметку...'}
            </span>
          )}
        </div>

        {/* Row 4: Markers + Indicators | Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {/* Markers */}
            {markerButtons.map(m => (
              <button
                key={m.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerChange(user.user_id, user.marker === m.id ? null : m.id);
                }}
                className={cn(
                  'p-0.5 rounded transition-colors',
                  user.marker === m.id ? m.activeClass : 'text-muted-foreground/40 hover:text-muted-foreground'
                )}
              >
                <m.icon size={14} />
              </button>
            ))}

            <div className="w-px h-3.5 bg-border mx-0.5" />

            {/* Chat indicators */}
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare size={10} />
              <span>{dialog?.message_count || 0}</span>
              {aiActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            </div>

            {dialog?.has_media_messages && (
              <Paperclip size={10} className="text-muted-foreground ml-0.5" />
            )}

            {dialog?.has_new_messages && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
            )}
          </div>

          {/* Action buttons - all 16px */}
          <div className="flex items-center gap-0.5">
            {currentStatus !== 'in_work' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(user.user_id, 'in_work'); }}
                className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="В работу"
              >
                <UserCheck size={16} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(user.user_id); }}
              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Архив"
            >
              <Archive size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenChat(user); }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Чат"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://t.me/${user.username}`, '_blank'); }}
              className="p-1 rounded text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="Telegram"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
