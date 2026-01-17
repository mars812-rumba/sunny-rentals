// ОБНОВЛЕНИЯ ДЛЯ CRMPAGE.TSX - ЭТАП 8
// Добавление TypeScript интерфейсов для работы с диалогами

// 1. ДОБАВИТЬ ИНТЕРФЕЙСЫ ПОСЛЕ ИМПОРТОВ (строка 21)
"""
// TypeScript интерфейсы для работы с диалогами
interface Dialog {
  active: boolean;
  has_new_messages: boolean;
  last_message_at: string;
  last_message_from: 'user' | 'manager' | 'claude';
  message_count: number;
  claude: {
    enabled: boolean;
    status: 'active' | 'paused' | 'stopped';
    started_at?: string;
    paused_at?: string;
  };
}

interface User {
  user_id: number;
  username: string;
  dialog?: Dialog;
  // ... остальные поля из существующего интерфейса
  status?: string;
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
}

// 2. ОБНОВИТЬ ТИПЫ В СОСТОЯНИИ (строка 33-50)
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

// 3. ДОБАВИТЬ ФУНКЦИЮ ФИЛЬТРАЦИИ ПОЛЬЗОВАТЕЛЕЙ (после строки 65)
const getFilteredUsers = (users: User[]): User[] => {
  return users.filter(user => {
    const dialog = user.dialog;
    
    if (dialogFilter === 'new') {
      return dialog?.has_new_messages;
    }
    if (dialogFilter === 'ai-on') {
      return dialog?.claude?.enabled;
    }
    if (dialogFilter === 'ai-off') {
      return dialog?.active && !dialog?.claude?.enabled;
    }
    return true;
  });
};

// 4. ДОБАВИТЬ ФУНКЦИЮ ФОРМАТИРОВАНИЯ ОТНОСИТЕЛЬНОГО ВРЕМЕНИ (после строки 65)
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

// 5. ОБНОВИТЬ ФУНКЦИЮ loadUserDetails (строка 102-125)
const loadUserDetails = async (user: User) => {
  setSelectedUser(user);
  setIsDetailsOpen(true);
  setChats([]);
  setBookings([]);
  
  try {
    const [cRes, bRes] = await Promise.all([
      fetch(`/api/crm/chats/${user.user_id}`),
      fetch(`/api/crm/bookings/${user.user_id}`)
    ]);
    const c = await cRes.json();
    const b = await bRes.json();
    if (c.status === 'ok') setChats(c.chats);
    if (b.status === 'ok') {
      setBookings(b.bookings);
      console.log('Loaded bookings:', b.bookings);
    }
    
    // Загружаем статус Claude для пользователя
    await fetchClaudeStatus(user.user_id);
    
    // Сбрасываем флаг новых сообщений при открытии чата
    await markDialogAsRead(user.user_id);
    
    setTimeout(scrollToBottom, 100);
  } catch (e) { 
    console.error("Ошибка деталей:", e); 
  }
};

// 6. ДОБАВИТЬ ФУНКЦИЮ markDialogAsRead (после строки 285)
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
        user.user_id === userId 
          ? { ...user, dialog: { ...user.dialog, has_new_messages: false } }
          : user
      ));
    }
  } catch (e) {
    console.error('Ошибка сброса флага новых сообщений:', e);
  }
};

// 7. ОБНОВИТЬ ОТОБРАЖЕНИЕ ПОЛЬЗОВАТЕЛЕЙ (строка 397-481)
{/* User Cards Grid */}
{loading ? (
  <div className="h-64 flex flex-col items-center justify-center text-slate-300">
     <RefreshCcw className="w-8 h-8 animate-spin mb-2" />
     <span className="text-[10px] font-bold uppercase tracking-widest">Загрузка...</span>
  </div>
) : (
  <>
    {/* Фильтры диалогов */}
    <div className="flex gap-2 mb-4 p-2 bg-white rounded-lg shadow-sm">
      <Button
        size="sm"
        variant={dialogFilter === 'all' ? 'default' : 'outline'}
        onClick={() => setDialogFilter('all')}
        className="text-[10px]"
      >
        Все ({users.length})
      </Button>
      <Button
        size="sm"
        variant={dialogFilter === 'new' ? 'default' : 'outline'}
        onClick={() => setDialogFilter('new')}
        className="text-[10px]"
      >
        🔴 Новые ({users.filter(u => u.dialog?.has_new_messages).length})
      </Button>
      <Button
        size="sm"
        variant={dialogFilter === 'ai-on' ? 'default' : 'outline'}
        onClick={() => setDialogFilter('ai-on')}
        className="text-[10px]"
      >
        🟢 AI ON
      </Button>
      <Button
        size="sm"
        variant={dialogFilter === 'ai-off' ? 'default' : 'outline'}
        onClick={() => setDialogFilter('ai-off')}
        className="text-[10px]"
      >
        🟡 AI OFF
      </Button>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {getFilteredUsers(users).map(user => {
        const days = getDaysCount(user.dates_selected?.start, user.dates_selected?.end);
        const dialog = user.dialog;
        const hasActiveDialog = dialog?.active || user.assistant_mode === true || user.claude_status === 'active' || user.assistant_enabled === true;
        
        return (
          <Card key={user.user_id} onClick={() => loadUserDetails(user)}
            className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-white relative overflow-hidden h-[90px]">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: STATUS_CONFIG[user.status]?.color }}></div>
            <CardContent className="p-3 h-full">
              <div className="flex justify-between items-center h-full gap-2">
                
                {/* ЛЕВАЯ ЧАСТЬ: Информация о клиенте */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      @{user.username || 'user'}
                    </span>
                    {user.category_interested && (
                      <Badge variant="outline" className="text-[8px] px-1 h-3 border-slate-200 text-slate-400 uppercase">
                        {user.category_interested}
                      </Badge>
                    )}
                    {/* Бейдж новых сообщений */}
                    {dialog?.has_new_messages && (
                      <span className="badge-new">🔴 Новое</span>
                    )}
                    {hasActiveDialog && (
                      <MessageSquare className="w-3 h-3 text-green-500 fill-current" />
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Car className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate">{user.car_interested || "Нет авто"}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold mt-1">
                    <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                    <span>
                      {user.dates_selected?.start ? dayjs(user.dates_selected.start).format('DD.MM') : '—'}
                      {user.dates_selected?.end ? ` - ${dayjs(user.dates_selected.end).format('DD.MM')}` : ''}
                    </span>
                    <span className="text-[9px] text-slate-400 font-black ml-1 uppercase">
                      ({days} дн.)
                    </span>
                  </div>
                  
                  {/* Если есть активный диалог */}
                  {dialog?.active && (
                    <div className="dialog-info">
                      {/* AI статус */}
                      <span className={`ai-status ${dialog.claude.enabled ? 'on' : 'off'}`}>
                        {dialog.claude.enabled ? '🟢 AI ON' : '🟡 AI OFF'}
                      </span>
                      
                      {/* Последнее сообщение */}
                      <span className="last-message">
                        {dialog.last_message_from === 'user' && '👤'}
                        {dialog.last_message_from === 'manager' && '👨‍💼'}
                        {dialog.last_message_from === 'claude' && '🤖'}
                        {' '}
                        {formatRelativeTime(dialog.last_message_at)}
                      </span>
                      
                      {/* Счётчик */}
                      <span className="message-count">
                        {dialog.message_count} сообщений
                      </span>
                    </div>
                  )}
                </div>

                {/* ПРАВАЯ ЧАСТЬ: ID, Дата и Кнопки управления */}
                <div className="flex flex-col items-end justify-between h-full py-0.5">
                  
                  {/* Группируем ID и Дату сверху */}
                  <div className="flex flex-col items-end leading-none">
                    <div className="text-[8px] text-slate-400 opacity-50 font-mono">
                      ID: {user.user_id}
                    </div>
                    <div className="text-[8px] text-slate-400 opacity-50 font-mono mt-0.5">
                      {dayjs(user.created_at).format('DD.MM.YY')}
                    </div>
                  </div>
                  
                  {/* Кнопки управления внизу */}
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100"
                      onClick={(e) => {e.stopPropagation(); window.open(`https://t.me/${user.username}`, '_blank')}}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-600 bg-slate-50 hover:bg-slate-100"
                      onClick={(e) => {e.stopPropagation(); loadUserDetails(user)}}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  </>
)}
"""