import { Lead, Booking, ChatMessage, UserDocument } from '@/types/crm';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Send as SendIcon, Calendar, MapPin, Phone, FileText, Download, User, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface LeadDetailModalProps {
  open: boolean;
  onClose: () => void;
  user: Lead | null;
  bookings: Booking[];
  chats: ChatMessage[];
  documents: UserDocument[];
  onSendMessage: (text: string) => void;
  onConfirmBooking?: (bookingId: string) => void;
}

const LeadDetailModal = ({
  open, onClose, user, bookings, chats, documents,
  onSendMessage, onConfirmBooking
}: LeadDetailModalProps) => {
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const formatDate = (d?: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).slice(2)}`;
  };

  const getDays = () => {
    if (!user.dates_selected?.start || !user.dates_selected?.end) return 0;
    return Math.round((new Date(user.dates_selected.end).getTime() - new Date(user.dates_selected.start).getTime()) / 86400000);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage('');
  };

  // Extract contact from first booking
  const contactBooking = bookings.find(b => b.form_data?.contact?.value || b.form_data?.contact?.name);
  const contact = contactBooking?.form_data?.contact;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-muted">{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-sm">@{user.username}</DialogTitle>
              <DialogDescription className="text-[10px]">ID: {user.user_id}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 h-8">
            <TabsTrigger value="info" className="text-xs h-7">Инфо и Заявки</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs h-7">Чат CRM</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {/* Contact block */}
            {contact && (
              <div className="rounded-md border border-border p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Phone size={12} />
                  Контакты
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Имя</div>
                    <div className="font-medium">{contact.name || '—'}</div>
                  </div>
                  {contact.value && (
                    <div>
                      <div className="text-[10px] text-muted-foreground">Телефон</div>
                      <button
                        onClick={() => window.open(`https://wa.me/${contact.value!.replace(/\D/g, '')}`, '_blank')}
                        className="font-medium text-green-600 hover:underline"
                      >
                        {contact.value}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bookings */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">
                Заявки ({bookings.length})
              </h4>
              {bookings.length > 0 ? bookings.map((b) => (
                <div key={b.booking_id} className="rounded-md border border-border p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{b.form_data?.car?.name || 'Авто'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.status}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(b.form_data?.dates?.start)} — {formatDate(b.form_data?.dates?.end)} ({getDays()} дн.)
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} />
                      {b.form_data?.locations?.pickup || '—'} → {b.form_data?.locations?.dropoff || '—'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {b.form_data?.pricing?.grandTotal ? `${b.form_data.pricing.grandTotal.toLocaleString()} ฿` : '—'}
                    </span>
                    {b.status === 'pre_booking' && onConfirmBooking && (
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => onConfirmBooking(b.booking_id)}>
                        Подтвердить
                      </Button>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">Заявок нет</p>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">
                Документы ({documents.length})
              </h4>
              {documents.length > 0 ? documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-xs truncate flex-1">{doc.filename || doc.file_name || 'document'}</span>
                  <button
                    onClick={() => window.open(doc.download_url, '_blank')}
                    className="p-1 rounded hover:bg-accent transition-colors"
                  >
                    <Download size={14} className="text-muted-foreground" />
                  </button>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">Документов нет</p>
              )}
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
              {chats.map((msg, i) => {
                const text = msg.text || msg.content?.text || msg.content?.message || '';
                if (!text && !msg.media && !msg.content?.media) return null;
                const isUser = msg.role === 'user';
                const isManager = msg.role === 'manager';
                return (
                  <div key={i} className={cn('flex flex-col', isUser ? 'items-start' : 'items-end')}>
                    <div className={cn(
                      'max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs',
                      isUser ? 'bg-muted text-foreground' :
                      isManager ? 'bg-blue-600 text-white' :
                      'bg-green-600 text-white'
                    )}>
                      {text}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {isManager ? 'Менеджер' : isUser ? 'Клиент' : 'AI'}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t border-border px-3 py-2 flex items-center gap-2">
              <input
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder="Сообщение..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <button
                onClick={handleSend}
                className="p-1.5 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <SendIcon size={14} />
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailModal;
