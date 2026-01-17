# ЗАДАЧА: Создать CRM-страницу для Sunny Rentals

## КОНТЕКСТ
Я разработчик Sunny Rentals - сервиса аренды авто на Пхукете. У меня есть Telegram Web App на React + Flask backend. Нужно добавить CRM-страницу для просмотра пользователей и их активности.

## ТЕКУЩАЯ СТРУКТУРА ПРОЕКТА

```
/root/tgbot/
├── webapp.py                    # Flask backend (главный файл)
├── user_tracker.py              # Модуль отслеживания пользователей
├── admin_commands.py            # Админские команды
├── user_data.json               # JSON с данными пользователей
├── chat_logs.jsonl              # Логи чатов
└── webapp/
    ├── src/
    │   ├── App.tsx              # Главный компонент с роутингом
    │   ├── pages/
    │   │   ├── Index.tsx        # Главная страница
    │   │   ├── CarsPage.tsx     # Страница с авто
    │   │   └── AdminPanel.tsx   # Админ-панель управления авто
    │   └── components/
    └── backend/
        └── data/
            └── web_cars.json    # База авто
```

## СТРУКТУРА user_data.json

```json
[
  {
    "user_id": 6451825371,
    "username": "mars_rent",
    "timestamp": "2025-11-10T13:18:33.746262",
    "source": "telegram_webapp",
    "action": "booking_submitted",
    "status": "new",
    "car_interested": "Toyota CAMRY 2020 Black",
    "dates_selected": {
      "start": "2025-12-06T17:00:00.000Z",
      "end": "2025-12-17T17:00:00.000Z",
      "days": 12
    },
    "form_started": true,
    "booking_submitted": true,
    "final_status": "booked"
  }
]
```

## СТРУКТУРА chat_logs.jsonl

```json
{"timestamp": "2025-11-10T08:12:31.749977", "user_id": 374897465, "role": "user", "content": "Привет! А что еще есть га мои даты?"}
{"timestamp": "2025-11-10T08:13:09.470548", "user_id": 374897465, "role": "assistant", "content": "Привет! 👋\n\nПодскажи, на какие даты тебе нужна машина?"}
```

## ЧТО НУЖНО СДЕЛАТЬ

### 1. BACKEND (Flask) - Добавить API эндпоинты в webapp.py

Добавь следующие эндпоинты после существующих (примерно после строки 2285):

```python
# ============ CRM API ============

@app.route('/api/crm/users', methods=['GET'])
def get_crm_users():
    """Получить список всех пользователей с фильтрацией"""
    try:
        # Проверка админа через query param
        admin_id = request.args.get('admin_id')
        if not admin_id or str(admin_id) != ADMIN_ID:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Фильтр по статусу
        status_filter = request.args.get('status', 'all')  # all|booked|warm|new
        
        # Загружаем данные
        users_data = tracker.get_all_users()
        
        # Применяем фильтр
        if status_filter != 'all':
            users_data = [u for u in users_data if u.get('final_status') == status_filter]
        
        # Сортируем по времени (свежие сверху)
        users_data.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            "status": "ok",
            "users": users_data,
            "total": len(users_data)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_crm_users: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/crm/user/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    """Получить детальную информацию о пользователе"""
    try:
        admin_id = request.args.get('admin_id')
        if not admin_id or str(admin_id) != ADMIN_ID:
            return jsonify({"error": "Unauthorized"}), 403
        
        user_data = tracker.get_user_data(user_id)
        
        if not user_data:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "status": "ok",
            "user": user_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_details: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/crm/chats/<int:user_id>', methods=['GET'])
def get_user_chats(user_id):
    """Получить историю чатов пользователя"""
    try:
        admin_id = request.args.get('admin_id')
        if not admin_id or str(admin_id) != ADMIN_ID:
            return jsonify({"error": "Unauthorized"}), 403
        
        chats = []
        
        # Читаем логи
        if os.path.exists(LOGS_FILE):
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        if log_entry.get('user_id') == user_id:
                            chats.append(log_entry)
                    except json.JSONDecodeError:
                        continue
        
        # Сортируем по времени
        chats.sort(key=lambda x: x.get('timestamp', ''))
        
        return jsonify({
            "status": "ok",
            "chats": chats,
            "total": len(chats)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_chats: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/crm/stats', methods=['GET'])
def get_crm_stats():
    """Получить общую статистику"""
    try:
        admin_id = request.args.get('admin_id')
        if not admin_id or str(admin_id) != ADMIN_ID:
            return jsonify({"error": "Unauthorized"}), 403
        
        users_data = tracker.get_all_users()
        
        stats = {
            "total_users": len(users_data),
            "booked": len([u for u in users_data if u.get('final_status') == 'booked']),
            "warm": len([u for u in users_data if u.get('final_status') == 'awaiting_followup' and u.get('form_started')]),
            "new": len([u for u in users_data if not u.get('form_started')]),
        }
        
        return jsonify({
            "status": "ok",
            "stats": stats
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_crm_stats: {e}")
        return jsonify({"error": str(e)}), 500
```

### 2. FRONTEND - Создать CRM страницу

#### 2.1 Создать файл: `webapp/src/pages/CRMPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  user_id: number;
  username: string | null;
  timestamp: string;
  car_interested: string | null;
  dates_selected: {
    start: string;
    end: string;
    days: number;
  } | null;
  action: string;
  final_status: string;
  form_started: boolean;
  booking_submitted: boolean;
}

interface ChatMessage {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Stats {
  total_users: number;
  booked: number;
  warm: number;
  new: number;
}

const CRMPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userChats, setUserChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const adminId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '374897465';

  useEffect(() => {
    fetchStats();
    fetchUsers('all');
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/crm/stats?admin_id=${adminId}`);
      const data = await response.json();
      if (data.status === 'ok') {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async (status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/crm/users?admin_id=${adminId}&status=${status}`);
      const data = await response.json();
      if (data.status === 'ok') {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserChats = async (userId: number) => {
    try {
      const response = await fetch(`/api/crm/chats/${userId}?admin_id=${adminId}`);
      const data = await response.json();
      if (data.status === 'ok') {
        setUserChats(data.chats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
    await fetchUserChats(user.user_id);
  };

  const getStatusBadge = (user: User) => {
    if (user.booking_submitted) {
      return <Badge className="bg-green-500">✅ Забронировал</Badge>;
    }
    if (user.form_started) {
      return <Badge className="bg-orange-500">🔥 Горячий</Badge>;
    }
    if (user.dates_selected) {
      return <Badge className="bg-yellow-500">🌡️ Теплый</Badge>;
    }
    return <Badge variant="secondary">🆕 Новый</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toString().includes(searchQuery);
    return matchesSearch;
  });

  const hasChats = (userId: number) => {
    // Можно добавить логику проверки наличия чатов
    return true;
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">🏠 Sunny Rentals CRM</h1>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Всего</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Забронировали</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.booked}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Теплые</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.warm}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Новые</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Фильтры */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              fetchUsers(value);
            }} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="booked">Забронировали</TabsTrigger>
                <TabsTrigger value="awaiting_followup">Теплые</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Поиск по username или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Таблица пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи ({filteredUsers.length})</CardTitle>
          <CardDescription>Кликните на пользователя для просмотра деталей</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Пользователь</th>
                    <th className="text-left py-2 px-4">Авто</th>
                    <th className="text-left py-2 px-4">Даты</th>
                    <th className="text-left py-2 px-4">Статус</th>
                    <th className="text-left py-2 px-4">Время</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.username ? `@${user.username}` : `ID: ${user.user_id}`}
                          </span>
                          {hasChats(user.user_id) && <span>💬</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.car_interested || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {user.dates_selected ? (
                          <div className="text-sm">
                            {formatDate(user.dates_selected.start)} - {formatDate(user.dates_selected.end)}
                            <span className="text-gray-500 ml-1">({user.dates_selected.days}д)</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(user)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatTimestamp(user.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модалка с деталями пользователя */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              👤 {selectedUser?.username ? `@${selectedUser.username}` : `ID: ${selectedUser?.user_id}`}
            </DialogTitle>
            <DialogDescription>
              Детальная информация о пользователе
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Информация */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Статус:</span>
                    {getStatusBadge(selectedUser)}
                  </div>
                  
                  {selectedUser.car_interested && (
                    <div>
                      <span className="text-sm text-gray-500">Интересует авто:</span>
                      <p className="font-medium">{selectedUser.car_interested}</p>
                    </div>
                  )}

                  {selectedUser.dates_selected && (
                    <div>
                      <span className="text-sm text-gray-500">Даты:</span>
                      <p className="font-medium">
                        {formatDate(selectedUser.dates_selected.start)} - {formatDate(selectedUser.dates_selected.end)}
                        <span className="text-gray-500 ml-2">({selectedUser.dates_selected.days} дней)</span>
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm text-gray-500">Последнее действие:</span>
                    <p className="font-medium">{selectedUser.action}</p>
                  </div>

                  <div>
                    <span className="text-sm text-gray-500">Время:</span>
                    <p className="font-medium">{formatTimestamp(selectedUser.timestamp)}</p>
                  </div>
                </div>

                {/* История чата */}
                {userChats.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">История диалога:</h3>
                    <div className="space-y-3">
                      {userChats.map((chat, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            chat.role === 'user'
                              ? 'bg-blue-50 ml-4'
                              : 'bg-gray-50 mr-4'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {chat.role === 'user' ? '👤 Клиент' : '🤖 Бот'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(chat.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{chat.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Действия */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => window.open(`https://t.me/${selectedUser.username}`, '_blank')}
                    disabled={!selectedUser.username}
                  >
                    📱 Написать в ТГ
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Закрыть
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMPage;
```

#### 2.2 Добавить роут в `webapp/src/App.tsx`

В файле App.tsx найди секцию с роутами и добавь:

```typescript
import CRMPage from '@/pages/CRMPage';

// В секции роутов добавь:
<Route path="/admin/crm" element={<CRMPage />} />
```

### 3. ВАЖНЫЕ МОМЕНТЫ

1. **Авторизация**: В коде используется `window.Telegram.WebApp.initDataUnsafe.user.id` для получения ID админа. Если это не работает, замени на хардкод: `const adminId = '374897465';`

2. **API URL**: Убедись что в `.env` файле правильно настроен `VITE_API_URL`

3. **CORS**: Flask уже имеет CORS настройку, но проверь что она разрешает запросы с фронтенда

4. **Компоненты shadcn/ui**: Код использует компоненты которые уже есть в проекте (Card, Badge, Button и т.д.)

## ИНСТРУКЦИЯ ПО ДЕПЛОЮ

1. **Добавь backend эндпоинты** в `webapp.py` (после строки 2285)
2. **Создай файл** `webapp/src/pages/CRMPage.tsx` с кодом выше
3. **Обнови** `webapp/src/App.tsx` - добавь импорт и роут
4. **Перезапусти** Flask сервер: `python3 webapp.py`
5. **Открой** в браузере: `http://localhost:5173/admin/crm` (для разработки)

## ТЕСТИРОВАНИЕ

1. Открой CRM страницу
2. Проверь что отображается статистика
3. Проверь фильтры (Все / Забронировали / Теплые)
4. Кликни на пользователя - должна открыться модалка
5. Проверь что отображается история чата (если есть)

## ВОЗМОЖНЫЕ ПРОБЛЕМЫ

**Ошибка 403**: Проверь что передается правильный admin_id в query параметрах

**Пустой список**: Проверь что `user_tracker.py` имеет метод `get_all_users()` который возвращает список пользователей

**Нет чатов**: Проверь путь к файлу `chat_logs.jsonl` в переменной `LOGS_FILE`

---

Готово! После выполнения всех шагов у тебя будет рабочая CRM страница на `/admin/crm` с просмотром пользователей, их статусов, выбранных дат и истории диалогов.
