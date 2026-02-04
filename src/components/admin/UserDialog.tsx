import React, { useState, useEffect, useRef } from 'react'; // ОБЯЗАТЕЛЬНО ТАК
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, X, RefreshCw, RefreshCcw, Play, Pause, Square, 
  Paperclip, Image, FileText, Car, Calendar, MapPin, 
  StickyNote, Pencil, Trash2, ToggleLeft, ToggleRight,
  MessageCircle, UserRoundCheck, UserRoundPlus, UserRoundMinus, UserRoundCheck as UserRoundOk
} from 'lucide-react';
import { User, Booking } from '@/types/crm';
import dayjs from 'dayjs';

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeTab: string;
  chats: any[];
  bookings: Booking[];
  onSendMessage: (msg: string) => void;
  onFileUpload?: (file: File, message?: string) => void;
  onClaudeAction?: (userId: number, action: 'start' | 'pause' | 'resume' | 'stop') => void;
  onSaveNote?: (note: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onUpdateNote?: (noteId: string, text: string) => void;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  loadingAction?: Record<string, boolean>;
  // For note editing
  editingNote?: { id: string; text: string } | null;
  setEditingNote?: (note: { id: string; text: string } | null) => void;
  // File handling
  selectedFile?: File | null;
  setSelectedFile?: (file: File | null) => void;
  isUploading?: boolean;
  onFileSelect?: (file: File) => void;
  onRemoveFile?: () => void;
}

const UserDialog: React.FC<UserDialogProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  activeTab, 
  chats, 
  bookings, 
  onSendMessage,
  onFileUpload,
  onClaudeAction,
  onSaveNote,
  onDeleteNote,
  onUpdateNote,
  onManualRefresh,
  isRefreshing = false,
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
  loadingAction = {},
  editingNote,
  setEditingNote,
  selectedFile,
  setSelectedFile,
  isUploading = false,
  onFileSelect,
  onRemoveFile
}) => {
  const [managerMessage, setManagerMessage] = useState('');
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, chats]);

  const formatDateSimple = (dateStr: string) => {
    if (!dateStr) return '—';
    return dayjs(dateStr).format('DD.MM.YYYY');
  };

  const getDaysCount = (start: any, end: any) => {
    if (!start || !end) return 0;
    const s = dayjs(start);
    const e = dayjs(end);
    const d = e.diff(s, 'day');
    return d <= 0 ? 1 : d;
  };

  const handleSendMessage = async () => {
    if (!managerMessage.trim()) return;
    onSendMessage(managerMessage);
    setManagerMessage('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFile && onFileUpload) {
      onFileUpload(selectedFile, managerMessage);
      setManagerMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) {
        handleFileUpload();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleSaveNote = () => {
    if (note.trim() && onSaveNote) {
      onSaveNote(note.trim());
      setNote('');
    }
  };

  const startEditNote = (note: any) => {
    if (setEditingNote) {
      setEditingNote({ id: note.note_id, text: note.text });
    }
  };

  const handleUpdateNote = () => {
    if (editingNote && onUpdateNote) {
      onUpdateNote(editingNote.id, editingNote.text);
      if (setEditingNote) setEditingNote(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 flex flex-col border-none rounded-none overflow-hidden">
        
        <div className="sr-only">
          <DialogTitle>Карточка клиента @{user?.username}</DialogTitle>
          <DialogDescription>Детали аренды, заявки и чат</DialogDescription>
        </div>

        {/* Header Modal */}
        <div className="p-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold uppercase">
                {user?.username?.[0] || 'U'}
              </div>
              <div>
                  <h2 className="text-sm font-black leading-tight">@{user?.username}</h2>
                  <p className="text-[9px] text-blue-400 font-bold uppercase">ID: {user?.user_id}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-white h-8 w-8 p-0 hover:bg-slate-800"
                onClick={onManualRefresh}
                disabled={isRefreshing}
              >
                <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" className="text-white h-8 w-8 p-0 hover:bg-slate-800" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
           </div>
        </div>

        <Tabs 
          value={activeTab} 
          className="flex-1 flex flex-col min-h-0 bg-white"
        >
            <TabsList className="bg-slate-50 border-b h-10 flex justify-start px-4 gap-4 rounded-none">
                <TabsTrigger value="info" className="h-10 rounded-none px-4 font-bold uppercase text-[10px] data-[state=active]:border-b-2 border-blue-600">Инфо и Заявки</TabsTrigger>
                <TabsTrigger value="chat" className="h-10 rounded-none px-4 font-bold uppercase text-[10px] text-blue-600 data-[state=active]:border-b-2 border-blue-600">Чат CRM</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
         {/* ВКЛАДКА ИНФО: Сводка, Заявки и История заметок */}
    <TabsContent value="info" className="m-0 h-full bg-white">
      <ScrollArea className="h-full">
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          
          {/* Блок 1: Общая сводка (Grid 3) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 transition-hover hover:bg-white hover:shadow-sm">
              <span className="text-[8px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Интерес</span>
              <p className="text-xs font-black text-slate-800 uppercase truncate">
                {user?.car_interested || 'Не выбрано'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 transition-hover hover:bg-white hover:shadow-sm">
              <span className="text-[8px] font-black uppercase text-slate-400 block mb-1 tracking-wider">Даты (фильтр)</span>
              <p className="text-xs font-black text-slate-800">
                {formatDateSimple(user?.dates_selected?.start)} — {formatDateSimple(user?.dates_selected?.end)}
              </p>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
              <span className="text-[8px] font-black uppercase text-blue-400 block mb-1 tracking-wider">Дней</span>
              <p className="text-xl font-black text-blue-600 leading-none">
                {getDaysCount(user?.dates_selected?.start, user?.dates_selected?.end)}
              </p>
            </div>
          </div>

          {/* Блок 2: Активные заявки (Bookings) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Car size={14} className="text-blue-500" /> Активные заявки ({bookings?.length || 0})
            </h3>
            
            {bookings && bookings.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {bookings.map((b, i) => (
                  <div key={i} className="group p-4 bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden hover:ring-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-black text-[13px] text-slate-900 uppercase tracking-tight">
                          {b.form_data?.car?.name || 'Авто не указано'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold mt-1">
                          <Calendar size={12} />
                          {dayjs(b.form_data?.dates?.start).format('DD.MM.YY')} — {dayjs(b.form_data?.dates?.end).format('DD.MM.YY')}
                        </div>
                      </div>
                      <Badge className={`text-[9px] font-black uppercase border-none px-2 py-0.5 rounded-md ${
                        b.status === 'confirmed' ? 'bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                        b.status === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-400 text-white'
                      }`}>
                        {b.status || 'new'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200/50 pt-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin size={12} className="text-red-400 shrink-0" />
                          <span className="font-bold truncate">ВЫДАЧА: {b.form_data?.locations?.pickup || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 pl-5">
                          <span className="truncate">ВОЗВРАТ: {b.form_data?.locations?.dropoff || '—'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Итоговая стоимость</span>
                        <span className="text-lg font-black text-slate-900 tracking-tight">
                          {b.form_data?.pricing?.grandTotal ? `${b.form_data.pricing.grandTotal.toLocaleString()} ฿` : '0 ฿'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Заявок пока нет</p>
              </div>
            )}
          </div>

          {/* Блок 3: История заметок и управление */}
          <div className="pt-8 border-t border-slate-100">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
              <StickyNote size={14} /> История заметок менеджера
            </h3>
            
            <div className="space-y-3">
              {/* Список из истории */}
              {user?.history_notes?.map((n) => (
                <div key={n.note_id} className="group p-3 bg-slate-50 rounded-xl border border-slate-100 relative transition-all hover:bg-white hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-slate-100">
                      {n.action === 'status_changed' ? '🔄 Статус' : '📝 Заметка'} • {dayjs(n.timestamp).format('DD.MM HH:mm')}
                    </span>
                    
                    {/* Кнопки управления (появляются при наведении) */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditNote(n)} className="text-blue-500 hover:scale-110 transition-transform">
                        <Pencil size={12} />
                      </button>
                      {onDeleteNote && (
                        <button onClick={() => onDeleteNote(n.note_id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingNote?.id === n.note_id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea 
                        value={editingNote.text} 
                        onChange={(e) => setEditingNote && setEditingNote({...editingNote, text: e.target.value})}
                        className="text-[11px] min-h-[60px] bg-white font-bold uppercase"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-[10px] bg-green-600 font-black uppercase" onClick={handleUpdateNote}>Сохранить</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-black uppercase" onClick={() => setEditingNote && setEditingNote(null)}>Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-700 leading-relaxed font-bold uppercase tracking-tight">
                      {n.text}
                    </p>
                  )}
                </div>
              ))}

              {/* Поле добавления новой заметки */}
              <div className="flex gap-2 pt-4">
                <Textarea 
                  className="min-h-[80px] text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
                  placeholder="Добавить новую заметку по клиенту..." 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                />
                <Button 
                  className="h-auto bg-slate-900 px-6 hover:bg-blue-600 transition-colors shadow-lg shadow-slate-200" 
                  onClick={handleSaveNote}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </TabsContent>

              {/* ВКЛАДКА ЧАТ */}
    <TabsContent value="chat" className="m-0 h-full flex flex-col bg-slate-100 overflow-hidden">
        {/* Чат занимает всё свободное место */}
     <ScrollArea className="flex-1 p-2">
      <div className="max-w-2xl mx-auto space-y-3 pb-4">
        {chats.map((msg, i) => {
          const media = msg?.content?.media;

          return (
            <div
              key={i}
              className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-2xl text-[10px] shadow-sm break-words ${
                  msg.role === 'user'
                    ? 'bg-white text-slate-800 rounded-bl-none'
                    : 'bg-blue-600 text-white rounded-br-none'
                }`}
              >
                {/* ===== MEDIA MESSAGE ===== */}
                {media?.type === 'sent_media' && media.download_url ? (
                  <div className="space-y-2">

                    {/* IMAGE */}
                    {media.content_type?.startsWith('image/') ? (
                      <div className="space-y-2">
                        <img
                          src={media.download_url}
                          alt={media.original_filename || 'image'}
                          className="max-w-xs rounded cursor-pointer border"
                          onClick={() => window.open(media.download_url, '_blank')}
                        />
                        {media.message && (
                          <p className="text-[10px] text-slate-100">{media.message}</p>
                        )}
                      </div>
                    ) : (
                      /* DOCUMENT */
                      <div className="space-y-2">
                        <div
                          className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition"
                          onClick={() => window.open(media.download_url, '_blank')}
                        >
                          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                            <span className="text-[8px] font-bold text-red-600">
                              {media.content_type === 'application/pdf' ? 'PDF' : 'FILE'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-slate-700 truncate">
                              {media.original_filename || media.filename || 'Document'}
                            </p>
                            <p className="text-[7px] text-slate-500">Click to download</p>
                          </div>

                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </Button>
                        </div>

                        {media.message && (
                          <p className="text-[10px] text-slate-100">{media.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ===== TEXT MESSAGE ===== */
                  <p>
                    {typeof msg?.content === 'string'
                      ? msg.content
                      : msg?.text || 'Пустое сообщение'}
                  </p>
                )}
              </div>

              <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase px-2">
                {msg.role}
              </span>
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>
    </ScrollArea>

    {/* Единый компактный блок управления и ввода */}
    <div className="bg-white border-t border-slate-200 shrink-0 p-3">
        <div className="max-w-2xl mx-auto">
            
            {/* РЯД 1: Кнопки контроля Claude */}
            {onClaudeAction && user && (
              <div className="flex justify-between gap-1 mb-3">
                <Button
                    size="sm" variant="ghost"
                    className="flex-1 h-8 text-[7px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    onClick={() => onClaudeAction(user.user_id, 'start')}
                    disabled={loadingAction[`claude_${user.user_id}_start`]}
                >
                    <Play className="w-1.5 h-1.5 mr-1 fill-current" /> START
                </Button>

                <Button
                    size="sm" variant="ghost"
                    className="flex-1 h-8 text-[7px] font-bold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200"
                    onClick={() => onClaudeAction(user.user_id, 'pause')}
                    disabled={loadingAction[`claude_${user.user_id}_pause`]}
                >
                    <Pause className="w-1.5 h-1.5" /> PAUSE
                </Button>

                <Button
                    size="sm" variant="ghost"
                    className="flex-1 h-8 text-[7px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    onClick={() => onClaudeAction(user.user_id, 'resume')}
                    disabled={loadingAction[`claude_${user.user_id}_resume`]}
                >
                    <RefreshCw className="w-1.5 h-1.5" /> RESUME
                </Button>

                <Button
                    size="sm" variant="ghost"
                    className="flex-1 h-8 text-[7px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    onClick={() => onClaudeAction(user.user_id, 'stop')}
                    disabled={loadingAction[`claude_${user.user_id}_stop`]}
                >
                    <Square className="w-1.5 h-1.5 fill-current" /> STOP
                </Button>
              </div>
            )}

            {/* РЯД 2: Индикация и Автообновление */}
            <div className="flex items-center justify-between mb-3 px-1 border-b border-slate-50 pb-2">
                {/* Статус AI */}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                        user?.dialog_status?.claude_status === 'active' ? 'bg-green-500 animate-pulse' :
                        user?.dialog_status?.claude_status === 'paused' ? 'bg-yellow-500' :
                        'bg-red-500'
                    }`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        Claude AI: <span className={user?.dialog_status?.claude_status === 'active' ? 'text-green-600' : 'text-slate-400'}>
                            {user?.dialog_status?.claude_status || 'OFF'}
                        </span>
                    </span>
                </div>

                {/* Блок автообновления */}
                {onToggleAutoRefresh && (
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                          Auto-refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
                      </span>
                      <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-8 p-0 hover:bg-transparent"
                          onClick={onToggleAutoRefresh}
                      >
                          {autoRefreshEnabled ? 
                              <ToggleRight className="w-7 h-7 text-green-500" /> : 
                              <ToggleLeft className="w-7 h-7 text-slate-300" />
                          }
                      </Button>
                  </div>
                )}
            </div>
                
            {/* File attachment preview */}
            {selectedFile && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedFile.type.startsWith('image/') ? (
                                <Image className="w-4 h-4 text-blue-600" />
                            ) : (
                                <FileText className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium text-blue-800">
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-blue-600">
                                ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onRemoveFile}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Поле ввода сообщения */}
            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-100 shadow-inner">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf"
                    className="hidden"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full w-8 h-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                >
                    <Paperclip className="w-3.5 h-3.5" />
                </Button>
                
                <input
                    className="flex-1 bg-transparent px-3 py-1 outline-none text-sm"
                    placeholder={selectedFile ? "Добавить описание к файлу..." : "Написать клиенту..."}
                    value={managerMessage}
                    onChange={(e) => setManagerMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                
                <Button
                    onClick={selectedFile ? handleFileUpload : handleSendMessage}
                    disabled={isUploading || (!managerMessage.trim() && !selectedFile)}
                    className="rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Send className="w-3.5 h-3.5" />
                    )}
                </Button>
            </div>
        </div>
    </div>
  </TabsContent>
            
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;