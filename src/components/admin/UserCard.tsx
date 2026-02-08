import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Car, Calendar, MapPin, StickyNote, MessageSquare, 
  Image, CirclePlus, CircleDollarSign, CircleMinus, 
  CircleCheckBig, Trash2, Play, MessageCircle, Send, SquareUser 
} from 'lucide-react';
import dayjs from 'dayjs';
import { User, MarkerType } from '@/types/crm';

interface UserCardProps {
  user: User;
  statusConfig: any;
  onOpenDetails: (user: User) => void;
  onOpenChat: (user: User) => void;
  onStatusChange: (userId: number, status: string) => void;
  onMarkerChange: (userId: number, marker: MarkerType | null) => void;
  onArchive: (userId: number) => void;
  onClaudeAction: (userId: number, action: string) => void;
  onQuickNoteEdit: (userId: number, text: string) => void;
  isEditingNote: boolean;
  tempNote: string;
  setTempNote: (val: string) => void;
  onSaveQuickNote: (userId: number) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  user, statusConfig, onOpenDetails, onOpenChat, onStatusChange,
  onMarkerChange, onArchive, onClaudeAction, onQuickNoteEdit,
  isEditingNote, tempNote, setTempNote, onSaveQuickNote
}) => {
  const currentStatus = user.final_status || user.status || 'new';
  const needsReply = user.dialog_status?.last_message_from === 'user';
  const days = user.dates_selected ? dayjs(user.dates_selected.end).diff(dayjs(user.dates_selected.start), 'day') : 0;

  return (
    <Card className={`group border-none shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden h-[115px] flex flex-col ${needsReply ? 'bg-amber-50/40 ring-1 ring-amber-200' : 'bg-white'}`}>
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: statusConfig[currentStatus]?.color }}></div>
      <CardContent className="p-2.5 flex flex-col justify-between h-full space-y-1">
        
        {/* Row 1: Car & Username */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Car className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-black text-[11px] text-slate-800 truncate uppercase tracking-tight">
              {user.car_interested || "Не выбрано"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className={`font-black text-[11px] truncate ${needsReply ? 'text-amber-700' : 'text-blue-600'}`}>
              @{user.username || 'user'}
            </span>
            <Button size="icon" variant="ghost" className="h-5 w-5 rounded text-slate-300 hover:text-blue-500" onClick={() => onOpenDetails(user)}>
              <SquareUser className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Row 2: Dates & ID */}
        <div className="flex justify-between items-center text-slate-500 text-[9px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-bold">
              <Calendar className="w-2.5 h-2.5 text-orange-400" />
              <span>{user.dates_selected?.start ? dayjs(user.dates_selected.start).format('DD.MM') : '??'}</span>
              <span>-</span>
              <span>{user.dates_selected?.end ? dayjs(user.dates_selected.end).format('DD.MM') : '??'}</span>
              <span className="text-blue-500 ml-1">{days}D</span>
            </div>
            <div className="flex items-center gap-1 opacity-70">
              <MapPin className="w-2.5 h-2.5 text-red-400" />
              <span className="truncate max-w-[80px]">{user.pickup_location || "Пхукет"}</span>
            </div>
          </div>
          <span className="text-[7px] font-mono italic">ID:{user.user_id}</span>
        </div>

        {/* Row 3: Quick Note */}
        <div 
          className={`flex items-center gap-1.5 rounded px-2 py-1 border transition-colors cursor-text min-h-[24px] ${user.last_note ? 'bg-[#f8b515]/10 border-[#f8b515]/30' : 'bg-slate-50 border-slate-100'}`}
          onClick={() => onQuickNoteEdit(user.user_id, user.last_note || '')}
        >
          <StickyNote className={`w-2.5 h-2.5 shrink-0 ${user.last_note ? 'text-[#f8b515]' : 'text-slate-400'}`} />
          {isEditingNote ? (
            <input 
              autoFocus className="text-[10px] bg-transparent outline-none w-full font-bold text-blue-600"
              value={tempNote} onChange={(e) => setTempNote(e.target.value)}
              onBlur={() => onSaveQuickNote(user.user_id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveQuickNote(user.user_id)}
            />
          ) : (
            <p className="text-[10px] font-medium truncate w-full italic text-slate-400">
              {user.last_note || "Добавить заметку..."}
            </p>
          )}
        </div>

        {/* Row 4: Indicators & Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {/* Маркеры (только для in_work) */}
            <MarkerButton type="need_offer" active={user.marker === 'need_offer'} onClick={() => user.status === 'in_work' && onMarkerChange(user.user_id, 'need_offer')} Icon={CircleDollarSign} color="text-amber-600" />
            <MarkerButton type="offer_sent" active={user.marker === 'offer_sent'} onClick={() => user.status === 'in_work' && onMarkerChange(user.user_id, 'offer_sent')} Icon={CircleCheckBig} color="text-blue-600" />
            <MarkerButton type="follow_up" active={user.marker === 'follow_up'} onClick={() => user.status === 'in_work' && onMarkerChange(user.user_id, 'follow_up')} Icon={CirclePlus} color="text-purple-600" />
            <MarkerButton type="need_new" active={user.marker === 'need_new'} onClick={() => user.status === 'in_work' && onMarkerChange(user.user_id, 'need_new')} Icon={MessageSquare} color="text-gray-600" />
            <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
            <div className="flex items-center gap-1 text-slate-400 text-[8px] font-bold">
              <MessageSquare className="w-2.5 h-2.5" />
              {user.dialog_status?.message_count || 0}
              {user.dialog_status?.has_new_messages && <div className="w-1 h-1 rounded-full bg-red-500"></div>}
            </div>
          </div>

          <div className="flex gap-1">
             <Button size="icon" variant="ghost" className="h-6 w-6 bg-slate-50 text-slate-400 hover:text-red-500" onClick={() => onArchive(user.user_id)}>
               <Trash2 className="w-3 h-3" />
             </Button>
             <Button size="icon" variant="ghost" className="h-6 w-6 bg-green-50 text-green-600" onClick={() => onClaudeAction(user.user_id, 'start')}>
               <Play className="w-3 h-3 fill-current" />
             </Button>
             <Button size="icon" variant="ghost" className="h-6 w-6 bg-blue-50 text-blue-600" onClick={() => onOpenChat(user)}>
               <MessageCircle className="w-3.5 h-3.5" />
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MarkerButton = ({ type, active, onClick, Icon, color }: { type: string, active: boolean, onClick: () => void, Icon: any, color: string }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`p-0.5 rounded transition-colors ${active ? `${color} bg-opacity-10` : 'text-slate-400 hover:bg-slate-50'}`}>
    <Icon className="w-3 h-3" />
  </button>
);