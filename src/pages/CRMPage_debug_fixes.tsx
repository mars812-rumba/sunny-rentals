import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import dayjs from 'dayjs';
import {
  Calendar, Car, StickyNote , MessageSquare, Plus, Pencil, Trash2, Phone,
  SquareUser, RefreshCcw, RefreshCw, Users,UserRoundPlus,UserRoundMinus,UserRoundCheck,
  Play, Square, Send, MapPin, X, User, Pause, ToggleLeft, ToggleRight,MessageCircle,Filter,
  CirclePlus, CircleDollarSign, CircleMinus, CircleCheckBig, Paperclip, Image, FileText
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { MarkerType } from '@/types/crm';

// TypeScript интерфейсы для работы с диалогами
interface DialogEvent {
  user_id: number;
  action: string;
  timestamp: string;

}

interface DialogStatus {
  active: boolean;
  has_new_messages: boolean;
  has_media_messages?: boolean;
  last_message_at: string | null;
  last_message_from: 'user' | 'manager' | 'claude' | null;
  message_count: number;
  claude_status: 'active' | 'paused' | 'stopped';
}


interface User {
  user_id: number;
  username: string;
  dialog_status?: DialogStatus; // Получаем из API
  // ... остальные поля из существующего интерфейса
  status?: string;
  final_status?: string; // PRIORITY: Manager's manual choice overrides status
  car_interested?: string;
  category_interested?: string;
  dates_selected?: {
    start: string;
    end: string;
  };
  created_at: string;
  assistant_mode?: boolean;
  claude_status?: string;
  assistant_enabled?: boolean;
  notes?: string[];
  last_note?: string;
  history_notes?: Array<{
    note_id: string;
    text: string;
    timestamp: string;
    action?: string;
  }>;
  pickup_location?: string;
  
  // Маркеры для ручного управления менеджером
  marker?: string | null;
}

const MAIN_STATUSES = ['new', 'interested', 'in_work', 'pending'];
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'new': { label: 'Холодные', color: '#64748b', bg: 'bg-slate-100' },
  'interested': { label: 'Теплые', color: '#2563eb', bg: 'bg-blue-50' },
  'in_work': { label: 'В работе', color: '#7c3aed', bg: 'bg-purple-50' },
  'pending': { label: 'Заявки', color: '#ea580c', bg: 'bg-orange-50' },
  'confirmed': { label: 'Бронь', color: '#10b981', bg: 'bg-emerald-50' },
  'completed': { label: 'Завершен', color: '#059669', bg: 'bg-green-100' },
  'archive': { label: 'Архив', color: '#94a3b8', bg: 'bg-slate-200' }
};

const CRMPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('new');
  const [period, setPeriod] = useState('week');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [managerMessage, setManagerMessage] = useState('');
  const [claudeStatuses, setClaudeStatuses] = useState<Record<number, string>>({});
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<'all' | 'new' | 'ai-on' | 'ai-off'>('all');
  const [activeTab, setActiveTab] = useState('info'); // По умолчанию 'info'
  const [editingNote, setEditingNote] = useState<{id: string, text: string} | null>(null);
  const [editingNoteId, setEditingNoteId] = useState(null); // ID юзера, чью заметку правим
  const [tempNote, setTempNote] = useState(''); // Временный текст для ввода
  const [markerFilter, setMarkerFilter] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ ИСПРАВЛЕНО: Улучшенная логика для userDocuments с правильной обработкой медиа
  const userDocuments = React.useMemo(() => {
    console.log('🔍 Анализ медиафайлов из чатов:', chats.length, 'сообщений');
    
    if (!chats || chats.length === 0) {
      console.log('📝 Нет чатов для анализа медиа');
      return [];
    }
    
    const documents = [];
    
    for (const msg of chats) {
      if (!msg) continue;
      
      // Ищем медиа в разных местах
      const media = msg?.content?.media || msg?.media || msg?.attachment;
      
      if (media && typeof media === 'object') {
        console.log('📎 Найден медиафайл:', media);
        
        // Определяем правильный URL для скачивания
        let downloadUrl = media.download_url;
        
        // Если URL не содержит /download/, строим правильный путь
        if (!downloadUrl?.includes('/download/')) {
          const filename = media.filename || media.file_name || 'unknown';
          const userId = selectedUser?.user_id || msg.user_id;
          
          if (downloadUrl?.includes('/incoming/')) {
            // Для incoming файлов
            downloadUrl = `/api/crm/media/${userId}/download/${filename}`;
          } else {
            // Для обычных файлов
            downloadUrl = `/api/crm/media/${userId}/download/${filename}`;
          }
        }
        
        documents.push({
          ...media,
          download_url: downloadUrl,
          message_timestamp: msg.timestamp,
          message_role: msg.role
        });
      }
    }
    
    console.log('📋 Всего найдено документов:', documents.length);
    return documents;
  }, [chats, selectedUser?.user_id]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

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

  const getFilteredUsers = (users: User[]): User[] => {
    return users.filter(user => {
      const dialog = user.dialog_status;

      // Фильтр по диалогам
      if (dialogFilter === 'new') {
        return dialog?.has_new_messages;
      }
      if (dialogFilter === 'ai-on') {
        return dialog?.claude_status === 'active';
      }
      if (dialogFilter === 'ai-off') {
        return dialog?.active && dialog?.claude_status !== 'active';
      }

      // Фильтр по маркерам
      if (markerFilter !== 'all') {
        return user.marker === markerFilter;
      }

      return true;
    });
  };

  const formatRelativeTime = (dateStr: string): string => {
    if (!dateStr) return '—';
    
    const now = dayjs();
    const date = dayjs(dateStr);
    const diffInMinutes = now.diff(date, 'minute');
    
    if (diffInMinutes < 1) return 'только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = now.diff(date, 'hour');
    if (diffInHours < 24) return `${diffInHours} ч назад`;
    
    const diffInDays = now.diff(date, 'day');
    if (diffInDays < 7) return `${diffInDays} дн назад`;
    
    return date.format('DD.MM.YY');
  };

  const loadMainData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch(`/api/crm/users?status=${activeStatus}&period=${period}`),
        fetch(`/api/crm/stats?period=${period}`)
      ]);
      const uData = await uRes.json();
      const sData = await sRes.json();
      if (uData.status === 'ok') {
        setUsers(uData.users);
      }
      if (sData.status === 'ok') {
        setStats(sData.stats);
      }
    } catch (e) {
      console.error("Ошибка загрузки данных:", e);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, period]);

  // ✅ ИСПРАВЛЕНО: Улучшенная функция загрузки чатов с детальным логированием
  const loadChats = useCallback(async (userId: number, silent: boolean = false) => {
    if (!silent) console.log('📥 Загружаем чаты для пользователя:', userId);
    
    try {
      const response = await fetch(`/api/crm/chats/${userId}`);
      const data = await response.json();
      
      if (data.status === 'ok' && data.chats) {
        console.log('📨 Получены данные чата:', data.chats.length, 'сообщений');
        console.log('🔍 Первые сообщения:', data.chats.slice(0, 3));
        
        // ✅ РАСШИРЕННЫЙ ФИЛЬТР: принимаем больше типов сообщений
        const validChats = data.chats.filter(msg => {
          if (!msg) {
            console.log('⚠️ Пропускаем null сообщение');
            return false;
          }
          
          // Проверяем разные варианты содержимого
          const hasText = msg.content?.text || msg.content?.message || msg.text || msg.message;
          const hasMedia = msg.content?.media || msg.media || msg.attachment;
          const hasContent = msg.content && typeof msg.content === 'object';
          
          const isValid = hasText || hasMedia || hasContent || msg.role;
          
          if (!isValid) {
            console.log('⚠️ Пропускаем сообщение без содержимого:', msg);
          }
          
          return isValid;
        });
        
        console.log('✅ Валидных сообщений после фильтрации:', validChats.length);
        console.log('📋 Структура первого сообщения:', validChats[0]);
        
        setChats(validChats);
      } else {
        console.log('❌ Ошибка загрузки чатов:', data);
        setChats([]);
      }
    } catch (e) {
      console.error("❌ Ошибка загрузки чатов:", e);
      setChats([]);
    }
  }, []);

  const loadUserDetails = async (user: any) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
    setChats([]); // Сбрасываем старый чат
    setBookings([]);
    
    try {
      console.log('👤 Загружаем детали пользователя:', user.user_id);
      
      // ✅ ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА с обработкой ошибок
      const requests = [
        fetch(`/api/crm/chats/${user.user_id}`),
        fetch(`/api/crm/bookings/${user.user_id}`)
      ];
      
      const responses = await Promise.allSettled(requests);
      
      // Обработка чатов
      if (responses[0].status === 'fulfilled') {
        const cData = await responses[0].value.json();
        if (cData.status === 'ok' && cData.chats) {
          const validChats = cData.chats.filter(msg => msg !== null);
          setChats(validChats);
          console.log('✅ Загружено чатов:', validChats.length);
        }
      } else {
        console.error('❌ Ошибка загрузки чатов:', responses[0].reason);
      }
      
      // Обработка бронирований
      if (responses[1].status === 'fulfilled') {
        const bData = await responses[1].value.json();
        if (bData.status === 'ok') setBookings(bData.bookings);
      } else {
        console.error('❌ Ошибка загрузки бронирований:', responses[1].reason);
      }
      
      await fetchClaudeStatus(user.user_id);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error("❌ Ошибка деталей:", e);
    }
  };

  const fetchClaudeStatus = async (userId: number) => {
    try {
      const response = await fetch(`/api/claude/status/${userId}`);
      const result = await response.json();
      
      if (result.status === 'success') {
        // Обновляем статус в основном списке пользователей
        setUsers(prev => prev.map(user => {
          if (user.user_id === userId && user.dialog_status) {
            return {
              ...user,
              dialog_status: {
                ...user.dialog_status,
                claude_status: result.data.claude_status
              }
            };
          }
          return user;
        }));
      }
    } catch (e) {
      console.error('❌ Ошибка получения статуса Claude:', e);
    }
  };

  const fetchDialogStatus = async (userId: number): Promise<DialogStatus> => {
    const response = await fetch(`/api/crm/dialog/${userId}/status`);
    const data = await response.json();
    return data.dialog;
  };

  const fetchDialogEvents = async (userId: number, limit: number = 50): Promise<DialogEvent[]> => {
    const response = await fetch(`/api/crm/dialog/${userId}/events?limit=${limit}`);
    const data = await response.json();
    return data.events;
  };

  const markDialogAsRead = async (userId: number) => {
    try {
      const response = await fetch(`/api/crm/dialog/${userId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setUsers(prev => prev.map(user =>
          user.user_id === userId && user.dialog_status
            ? { ...user, dialog_status: { ...user.dialog_status, has_new_messages: false } }
            : user
        ));
      }
    } catch (e) {
      console.error('❌ Ошибка сброса флага новых сообщений:', e);
    }
  };

  const refreshSingleDialogStatus = async (userId: number) => {
    try {
      const dialogStatus = await fetchDialogStatus(userId);
      setUsers(prev => prev.map(user => {
        if (user.user_id === userId) {
          return { ...user, dialog_status: dialogStatus };
        }
        return user;
      }));
    } catch (e) {
      console.error(`❌ Ошибка обновления статуса диалога для пользователя ${userId}:`, e);
    }
  };

  const refreshAllDialogStatuses = async () => {
    try {
      const promises = users.map(user => 
        fetch(`/api/crm/dialog/${user.user_id}/status`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null) // Игнорируем ошибки для конкретных юзеров
      );

      const results = await Promise.all(promises);
      
      setUsers(prev => prev.map((user, index) => {
        const result = results[index];
        if (result && result.dialog) {
          return { ...user, dialog_status: result.dialog };
        }
        return user;
      }));
    } catch (e) {
      console.error('❌ Ошибка обновления статусов диалогов:', e);
    }
  };

  useEffect(() => { 
    loadMainData(); 
  }, [loadMainData]);

  // ✅ ИСПРАВЛЕНО: Улучшенное отображение сообщений в чате
  const renderMessage = (msg: any, i: number) => {
    // ✅ УЛУЧШЕННАЯ ОБРАБОТКА ДАННЫХ СООБЩЕНИЯ
    const textContent = (() => {
      // Проверяем разные варианты структуры
      if (typeof msg.content === 'object') {
        return msg.content.text || msg.content.message || msg.content.content || '';
      }
      return msg.text || msg.message || msg.content || '';
    })();

    const media = msg?.content?.media || msg?.media || msg?.attachment;
    
    console.log(`📨 Сообщение ${i}:`, { 
      role: msg.role, 
      hasText: !!textContent, 
      hasMedia: !!media,
      text: textContent?.substring(0, 50),
      media: media 
    });

    return (
      <div key={msg.id || `${msg.timestamp}-${i}`} 
           className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
        <div className={`max-w-[85%] p-3 rounded-2xl text-[10px] shadow-sm ${
          msg.role === 'user' ? 'bg-white text-slate-800 rounded-bl-none' : 
                                'bg-blue-600 text-white rounded-br-none'
        }`}>
          
          {/* ✅ РАСШИРЕННАЯ ОБРАБОТКА МЕДИА */}
          {media ? (
            <div className="flex flex-col gap-2">
              {/* Обработка изображений */}
              {(media.content_type?.startsWith('image/') || 
                media.type === 'image' || 
                media.mime_type?.startsWith('image/')) ? (
                <>
                  <img
                    src={media.download_url || `/api/crm/media/${selectedUser?.user_id}/download/${media.filename}`}
                    alt={media.filename || "uploaded"}
                    className="rounded-lg cursor-pointer border border-black/10 shadow-sm hover:opacity-90 transition-opacity"
                    style={{ 
                      width: '40%',
                      minWidth: '140px',
                      height: 'auto' 
                    }}
                    onClick={() => {
                      const url = media.download_url || `/api/crm/media/${selectedUser?.user_id}/download/${media.filename}`;
                      window.open(url, '_blank');
                    }}
                    onError={(e) => {
                      console.error('❌ Image load error:', media.download_url);
                      if (msg.role !== 'manager') {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                  {textContent && <p className="mt-1 leading-relaxed">{textContent}</p>}
                </>
              ) : (
                /* PDF/DOC файлы */
                <div className="flex items-center gap-2 p-2 bg-black/5 rounded-lg cursor-pointer"
                     onClick={() => {
                       const url = media.download_url || `/api/crm/media/${selectedUser?.user_id}/download/${media.filename}`;
                       window.open(url, '_blank');
                     }}>
                  <div className="p-2 bg-blue-500 rounded text-white font-bold text-[8px]">
                    {media.content_type?.includes('pdf') ? 'PDF' : 'FILE'}
                  </div>
                  <span className="truncate max-w-[150px]">{media.filename || 'File'}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = media.download_url || `/api/crm/media/${selectedUser?.user_id}/download/${media.filename}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = media.filename || 'file';
                      link.click();
                    }}
                  >
                    📥
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Только текст */
            <p className="whitespace-pre-wrap leading-relaxed">
              {textContent || 'Пустое сообщение'}
            </p>
          )}
        </div>
        
        <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase px-2 tracking-widest">
          {msg.role}
        </span>
      </div>
    );
  };

  // ✅ ИСПРАВЛЕНО: Улучшенная загрузка файлов
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedUser) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', selectedUser.user_id.toString());
      formData.append('message', managerMessage || '');
      
      console.log('📤 Загружаем файл:', selectedFile.name, 'для пользователя:', selectedUser.user_id);
      
      const response = await fetch('/api/crm/send_media', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.status === 'ok') {
        console.log('✅ Файл успешно отправлен:', result);
        
        // Добавляем сообщение в чат
        const newMessage = {
          role: 'manager',
          content: {
            text: managerMessage || '',
            media: {
              ...result.media,
              download_url: result.media.download_url || `/api/crm/media/${selectedUser.user_id}/download/${result.media.filename}`
            }
          },
          timestamp: new Date().toISOString(),
          id: Date.now()
        };
        
        setChats(prev => [...prev, newMessage]);
        
        // Очищаем форму
        setSelectedFile(null);
        setManagerMessage('');
        setTimeout(scrollToBottom, 100);
        
      } else {
        console.error('❌ Ошибка отправки файла:', result);
        alert('Ошибка отправки файла: ' + (result.message || 'Неизвестная ошибка'));
      }
    } catch (e) {
      console.error('❌ Ошибка загрузки файла:', e);
      alert('Ошибка загрузки файла');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!managerMessage.trim() || !selectedUser) return;
    
    setLoadingAction(prev => ({...prev, sending: true}));
    
    try {
      const response = await fetch('/api/crm/send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          text: managerMessage.trim(),
          timestamp: new Date().toISOString()
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'ok' || result.status === 'partial_success') {
        // Добавляем сообщение в локальный чат
        const newMessage = {
          role: 'manager',
          content: { text: managerMessage.trim() },
          timestamp: new Date().toISOString(),
          id: Date.now()
        };
        
        setChats(prev => [...prev, newMessage]);
        setManagerMessage('');
        setTimeout(scrollToBottom, 100);
      } else {
        console.error('❌ Ошибка отправки сообщения:', result);
        alert('Ошибка отправки сообщения: ' + (result.message || 'Неизвестная ошибка'));
      }
    } catch (e) {
      console.error('❌ Ошибка отправки сообщения:', e);
      alert('Ошибка отправки сообщения');
    } finally {
      setLoadingAction(prev => ({...prev, sending: false}));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Заголовок */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800">CRM Панель</h1>
          <p className="text-slate-600">Управление диалогами и клиентами</p>
        </div>

        {/* Фильтры */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Статус:</span>
                <div className="flex gap-1">
                  {MAIN_STATUSES.map(status => (
                    <Button
                      key={status}
                      variant={activeStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveStatus(status)}
                    >
                      {STATUS_CONFIG[status].label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Период:</span>
                <select 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="today">Сегодня</option>
                  <option value="week">Неделя</option>
                  <option value="month">Месяц</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Диалоги:</span>
                <select 
                  value={dialogFilter} 
                  onChange={(e) => setDialogFilter(e.target.value as any)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">Все</option>
                  <option value="new">Новые</option>
                  <option value="ai-on">AI активен</option>
                  <option value="ai-off">AI выключен</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMainData()}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Обновить'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(stats).map(([status, count]) => (
              <Card key={status} className={`${STATUS_CONFIG[status]?.bg || 'bg-gray-50'}`}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold" style={{color: STATUS_CONFIG[status]?.color}}>
                    {count as number}
                  </div>
                  <div className="text-xs text-slate-600">{STATUS_CONFIG[status]?.label || status}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Список пользователей */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Пользователи ({getFilteredUsers(users).length})</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllDialogStatuses}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Обновить статусы
              </Button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredUsers(users).map(user => (
                <div
                  key={user.user_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.user_id === user.user_id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => loadUserDetails(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          @{user.username || 'Без имени'} 
                          {user.dialog_status?.has_new_messages && (
                            <Badge variant="destructive" className="ml-2 text-xs">Новое</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.dialog_status?.message_count || 0} сообщений
                          {user.dialog_status?.claude_status === 'active' && (
                            <Badge variant="secondary" className="ml-1 text-xs">AI</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      {user.dialog_status?.last_message_at && formatRelativeTime(user.dialog_status.last_message_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Детали пользователя и чат */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <SquareUser className="w-5 h-5" />
                Диалог с @{selectedUser?.username || 'Пользователь'}
                {selectedUser?.dialog_status?.has_new_messages && (
                  <Badge variant="destructive">Новое сообщение</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Информация</TabsTrigger>
                <TabsTrigger value="chat">Чат</TabsTrigger>
                <TabsTrigger value="documents">Документы</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="flex-1 overflow-auto space-y-4">
                {selectedUser && (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-slate-600">ID пользователя</label>
                            <div className="text-sm">{selectedUser.user_id}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Статус</label>
                            <div className="text-sm">{selectedUser.final_status || selectedUser.status}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Создан</label>
                            <div className="text-sm">{formatDateSimple(selectedUser.created_at)}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Сообщений</label>
                            <div className="text-sm">{selectedUser.dialog_status?.message_count || 0}</div>
                          </div>
                        </div>
                        
                        {selectedUser.dialog_status && (
                          <div className="pt-3 border-t">
                            <label className="text-sm font-medium text-slate-600">Статус диалога</label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={selectedUser.dialog_status.active ? "default" : "secondary"}>
                                {selectedUser.dialog_status.active ? 'Активный' : 'Неактивный'}
                              </Badge>
                              {selectedUser.dialog_status.claude_status === 'active' && (
                                <Badge variant="outline">AI активен</Badge>
                              )}
                              {selectedUser.dialog_status.has_new_messages && (
                                <Badge variant="destructive">Новые сообщения</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chat" className="flex-1 flex flex-col">
                {/* ✅ ИСПРАВЛЕНО: Чат с улучшенным отображением сообщений */}
                <ScrollArea className="flex-1 p-2 bg-slate-50/50">
                  <div className="max-w-2xl mx-auto space-y-3 pb-4">
                    {chats.length === 0 ? (
                      <div className="text-center text-slate-500 py-8">
                        Нет сообщений в диалоге
                      </div>
                    ) : (
                      chats.map(renderMessage)
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Форма отправки */}
                <div className="border-t p-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-4 h-4 mr-1" />
                      Файл
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                    />
                  </div>

                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm flex-1">{selectedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Напишите сообщение..."
                      value={managerMessage}
                      onChange={(e) => setManagerMessage(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!managerMessage.trim() || loadingAction.sending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {selectedFile && (
                    <Button 
                      onClick={handleFileUpload}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? 'Отправка...' : 'Отправить файл'}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="flex-1 overflow-auto">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Документы пользователя</h3>
                  
                  {userDocuments.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      Нет документов
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {userDocuments.map((doc, index) => (
                        <Card key={index} className="overflow-hidden">
                          <CardContent className="p-3">
                            {doc.content_type?.startsWith('image/') ? (
                              <div className="space-y-2">
                                <img
                                  src={doc.download_url}
                                  alt={doc.filename}
                                  className="w-full h-32 object-cover rounded cursor-pointer"
                                  onClick={() => window.open(doc.download_url, '_blank')}
                                />
                                <div className="space-y-1">
                                  <div className="text-xs font-medium truncate">{doc.filename}</div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = doc.download_url;
                                      link.download = doc.filename;
                                      link.click();
                                    }}
                                  >
                                    Скачать
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-4 bg-slate-100 rounded">
                                  <FileText className="w-8 h-8 text-slate-600" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{doc.filename}</div>
                                    <div className="text-xs text-slate-500">{doc.content_type}</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = doc.download_url;
                                    link.download = doc.filename;
                                    link.click();
                                  }}
                                  className="w-full"
                                >
                                  Скачать
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CRMPage;