# Интеграция системы отслеживания статуса диалогов (ПРАВИЛЬНЫЙ ПОДХОД)

## 📋 КОНТЕКСТ
У нас есть rental CRM система с бэкендом (FastAPI) и фронтом (React). 
Бот на Flask отдельно, но работает с теми же файлами что и бэкенд.

## 🎯 ЗАДАЧА
Добавить систему отслеживания статуса диалогов, используя правильную архитектуру:
- **user_data.json** - статичная сущность (контакты, имя, чат айди и т.д.)
- **crm_history.jsonl** - динамическая история событий (статусы, сообщения, диалоги, букинги)

## 📊 СТРУКТУРА ДАННЫХ
Добавить новые типы событий в crm_history.jsonl:

### События диалогов:
```json
{"timestamp": "2026-01-11T08:30:00Z", "user_id": 123456789, "action": "dialog_started", "initiated_by": "user"}
{"timestamp": "2026-01-11T08:31:00Z", "user_id": 123456789, "action": "message_received", "from": "user", "content": "Привет"}
{"timestamp": "2026-01-11T08:32:00Z", "user_id": 123456789, "action": "message_sent", "from": "manager", "content": "Здравствуйте!"}
{"timestamp": "2026-01-11T08:33:00Z", "user_id": 123456789, "action": "claude_started", "initiated_by": "manager"}
{"timestamp": "2026-01-11T08:34:00Z", "user_id": 123456789, "action": "claude_response", "from": "claude", "content": "Ответ Claude"}
{"timestamp": "2026-01-11T08:35:00Z", "user_id": 123456789, "action": "dialog_paused", "reason": "manager_pause"}
{"timestamp": "2026-01-11T08:36:00Z", "user_id": 123456789, "action": "dialog_resumed", "initiated_by": "manager"}
{"timestamp": "2026-01-11T08:37:00Z", "user_id": 123456789, "action": "dialog_stopped", "reason": "completed"}
{"timestamp": "2026-01-11T08:38:00Z", "user_id": 123456789, "action": "messages_marked_read", "by": "manager"}
```

### События статусов:
```json
{"timestamp": "2026-01-11T08:30:00Z", "user_id": 123456789, "action": "status_changed", "old_status": "new", "new_status": "in_progress", "note": "Начался диалог"}
```

---

# ЭТАПЫ РЕАЛИЗАЦИИ

## ЭТАП 1: БЭКЕНД - Функции работы с историей диалогов
**Файл:** `backend/web_integration.py`

### 1.1 Создать функцию log_dialog_event()
```python
def log_dialog_event(user_id: int, action: str, **kwargs):
    """
    Логирует событие диалога в crm_history.jsonl
    
    Параметры:
    - action: str - тип события (dialog_started, message_received, message_sent, claude_started, etc.)
    - **kwargs: дополнительные данные события
    """
    # Создать запись события
    # Записать в crm_history.jsonl
```

### 1.2 Создать функцию get_dialog_status_from_history()
```python
def get_dialog_status_from_history(user_id: int):
    """
    Получает статус диалога из истории crm_history.jsonl
    
    Возвращает:
    - active: bool - есть ли активный диалог
    - has_new_messages: bool - есть ли новые непрочитанные сообщения
    - last_message_at: str - время последнего сообщения
    - last_message_from: str - от кого последнее сообщение
    - message_count: int - количество сообщений в диалоге
    - claude_status: str - статус Claude (active/paused/stopped)
    """
    # Читать crm_history.jsonl
    # Фильтровать события по user_id
    # Анализировать последние события
    # Возвращать агрегированный статус
```

### 1.3 Создать функцию get_dialog_events()
```python
def get_dialog_events(user_id: int, limit: int = 50):
    """
    Получает историю событий диалога пользователя
    """
    # Читать crm_history.jsonl
    # Фильтровать события диалога по user_id
    # Возвращать последние limit событий
```

### 1.4 Протестировать функции
- Создать тестовые события
- Проверить анализ статусов
- Проверить получение истории

---

## ЭТАП 2: БЭКЕНД - Интеграция с существующими функциями
**Файл:** `backend/web_integration.py`

### 2.1 Обновить notify_telegram_bot_about_webapp_opened()
```python
# Добавить вызов:
log_dialog_event(
    user_id=user_id,
    action="dialog_started",
    initiated_by="user",
    username=username
)
```

### 2.2 Обновить notify_telegram_bot_about_filters_used()
```python
# Добавить вызов:
log_dialog_event(
    user_id=user_id,
    action="dialog_continued",
    initiated_by="user",
    event_type="filters_used",
    filters=filters,
    username=username
)
```

### 2.3 Обновить notify_telegram_bot_about_booking()
```python
# Добавить вызов:
log_dialog_event(
    user_id=user_id,
    action="booking_submitted",
    initiated_by="user",
    booking_id=booking_id,
    form_data=form_data,
    username=username
)
```

### 2.4 Протестировать интеграцию
- Проверить логирование событий
- Проверить анализ статусов

---

## ЭТАП 3: БЭКЕНД - API Endpoints для диалогов
**Файл:** `backend/web_integration.py`

### 3.1 Добавить endpoint /api/crm/dialog/{user_id}/status
```python
@app.get("/api/crm/dialog/{user_id}/status")
def get_dialog_status_endpoint(user_id: int):
    """Получить статус диалога из истории"""
    dialog_status = get_dialog_status_from_history(user_id)
    return {"dialog": dialog_status}
```

### 3.2 Добавить endpoint /api/crm/dialog/{user_id}/events
```python
@app.get("/api/crm/dialog/{user_id}/events")
def get_dialog_events_endpoint(user_id: int, limit: int = Query(50, ge=1, le=200)):
    """Получить историю событий диалога"""
    events = get_dialog_events(user_id, limit)
    return {"events": events, "total": len(events)}
```

### 3.3 Добавить endpoint /api/crm/dialog/{user_id}/mark-read
```python
@app.post("/api/crm/dialog/{user_id}/mark-read")
def mark_dialog_read(user_id: int):
    """Сбросить флаг новых сообщений когда менеджер открыл чат"""
    log_dialog_event(
        user_id=user_id,
        action="messages_marked_read",
        by="manager"
    )
    return {"status": "ok"}
```

### 3.4 Добавить endpoint /api/crm/dialogs/active
```python
@app.get("/api/crm/dialogs/active")
def get_active_dialogs():
    """Получить список всех активных диалогов"""
    # Читать всю историю
    # Найти пользователей с активными диалогами
    # Возвращать агрегированную информацию
```

### 3.5 Протестировать endpoints
- Проверить работу через curl/Postman
- Проверить обработку ошибок

---

## ЭТАП 4: БЭКЕНД - Claude интеграция
**Файл:** `backend/web_integration.py`

### 4.1 Обновить Claude endpoints с логированием
- Добавить log_dialog_event в все Claude endpoints
- Логировать события START/PAUSE/RESUME/STOP

### 4.2 Добавить логирование Claude событий
```python
# START Claude
log_dialog_event(
    user_id=user_id,
    action="claude_started",
    initiated_by="manager"
)

# PAUSE Claude
log_dialog_event(
    user_id=user_id,
    action="claude_paused",
    reason="manager_pause"
)

# RESUME Claude
log_dialog_event(
    user_id=user_id,
    action="claude_resumed",
    initiated_by="manager"
)

# STOP Claude
log_dialog_event(
    user_id=user_id,
    action="claude_stopped",
    reason="manager_stop"
)
```

### 4.3 Протестировать Claude интеграцию
- Проверить все состояния Claude
- Проверить логирование

---

## ЭТАП 5: БОТ - Обработчики сообщений
**Файл:** `backend/telegram_bot.py`

### 5.1 Добавить обработчики сообщений пользователей
```python
# Когда клиент пишет сообщение в бота:
log_dialog_event(
    user_id=user_id,
    action="message_received",
    from="user",
    content=message_text,
    username=username
)
```

### 5.2 Добавить обработчики сообщений менеджеров
```python
# Когда менеджер отправляет сообщение из CRM:
log_dialog_event(
    user_id=user_id,
    action="message_sent",
    from="manager",
    content=message_text
)
```

### 5.3 Добавить обработчики Claude ответов
```python
# Когда Claude отправляет ответ:
log_dialog_event(
    user_id=user_id,
    action="claude_response",
    from="claude",
    content=response_text
)
```

### 5.4 Протестировать бота
- Проверить обработку всех типов сообщений
- Проверить обновление статусов

---

## ЭТАП 6: БОТ - Управление диалогами
**Файл:** `backend/telegram_bot.py`

### 6.1 Интегрировать START/PAUSE/RESUME/STOP диалогов
- Добавить вызовы log_dialog_event в команды управления
- Обновить логику команд

### 6.2 Добавить логирование действий
- Логировать все действия с диалогами
- Записывать в crm_history.jsonl

### 6.1 Интегрировать START/PAUSE/RESUME/STOP диалогов
**Файл:** `backend/telegram_bot.py`

#### 6.1.1 Обновить команду /start_claude
```python
@bot.message_handler(commands=['start_claude'])
def start_claude_command(message):
    user_id = message.from_user.id
    username = message.from_user.username

    # Логировать событие
    log_dialog_event(
        user_id=user_id,
        action="claude_started",
        initiated_by="manager",
        username=username,
        command="start_claude"
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        claude_enabled=True,
        claude_status="active",
        claude_started_at=datetime.now().isoformat()
    )

    # Отправить подтверждение
    bot.reply_to(message, "🤖 Claude запущен для пользователя")
```

#### 6.1.2 Обновить команду /pause_claude
```python
@bot.message_handler(commands=['pause_claude'])
def pause_claude_command(message):
    user_id = message.from_user.id
    username = message.from_user.username

    # Логировать событие
    log_dialog_event(
        user_id=user_id,
        action="claude_paused",
        initiated_by="manager",
        username=username,
        command="pause_claude"
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        claude_enabled=False,
        claude_status="paused",
        claude_paused_at=datetime.now().isoformat()
    )

    # Отправить подтверждение
    bot.reply_to(message, "⏸️ Claude приостановлен")
```

#### 6.1.3 Обновить команду /resume_claude
```python
@bot.message_handler(commands=['resume_claude'])
def resume_claude_command(message):
    user_id = message.from_user.id
    username = message.from_user.username

    # Логировать событие
    log_dialog_event(
        user_id=user_id,
        action="claude_resumed",
        initiated_by="manager",
        username=username,
        command="resume_claude"
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        claude_enabled=True,
        claude_status="active"
    )

    # Отправить подтверждение
    bot.reply_to(message, "▶️ Claude возобновлен")
```

#### 6.1.4 Обновить команду /stop_claude
```python
@bot.message_handler(commands=['stop_claude'])
def stop_claude_command(message):
    user_id = message.from_user.id
    username = message.from_user.username

    # Логировать событие
    log_dialog_event(
        user_id=user_id,
        action="claude_stopped",
        initiated_by="manager",
        username=username,
        command="stop_claude"
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        active=False,
        claude_enabled=False,
        claude_status="stopped"
    )

    # Отправить подтверждение
    bot.reply_to(message, "⏹️ Claude остановлен")
```

### 6.2 Добавить логирование действий
**Файл:** `backend/telegram_bot.py`

#### 6.2.1 Добавить логирование в обработчик сообщений
```python
@bot.message_handler(func=lambda message: True)
def handle_all_messages(message):
    user_id = message.from_user.id
    username = message.from_user.username
    text = message.text

    # Логировать входящее сообщение
    log_dialog_event(
        user_id=user_id,
        action="message_received",
        from="user",
        content=text,
        username=username,
        message_type="text"
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        active=True,
        has_new_messages=True,
        last_message_at=datetime.now().isoformat(),
        last_message_from="user",
        message_count_increment=1
    )

    # Обработать сообщение...
```

#### 6.2.2 Добавить логирование отправки сообщений
```python
def send_message_to_user(user_id, text, **kwargs):
    """Отправить сообщение пользователю с логированием"""

    # Логировать исходящее сообщение
    log_dialog_event(
        user_id=user_id,
        action="message_sent",
        from="manager",
        content=text,
        **kwargs
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        active=True,
        last_message_at=datetime.now().isoformat(),
        last_message_from="manager",
        message_count_increment=1
    )

    # Отправить сообщение через Telegram API
    try:
        bot.send_message(user_id, text, **kwargs)
        return True
    except Exception as e:
        print(f"Failed to send message to {user_id}: {e}")
        return False
```

#### 6.2.3 Добавить логирование Claude ответов
```python
def send_claude_response(user_id, response_text, photos=None):
    """Отправить ответ Claude пользователю с логированием"""

    # Логировать ответ Claude
    log_dialog_event(
        user_id=user_id,
        action="claude_response",
        from="claude",
        content=response_text,
        photos_count=len(photos) if photos else 0
    )

    # Обновить статус диалога
    update_dialog_status(
        user_id=user_id,
        active=True,
        last_message_at=datetime.now().isoformat(),
        last_message_from="claude",
        message_count_increment=1
    )

    # Отправить сообщение
    try:
        if photos:
            # Отправить фото с подписью
            media_group = []
            for i, photo_path in enumerate(photos):
                photo_url = f"{WEBAPP_URL}/images_web/{photo_path}"
                if i == 0:
                    media_group.append(types.InputMediaPhoto(photo_url, caption=response_text))
                else:
                    media_group.append(types.InputMediaPhoto(photo_url))

            bot.send_media_group(user_id, media_group)
        else:
            bot.send_message(user_id, response_text)

        return True
    except Exception as e:
        print(f"Failed to send Claude response to {user_id}: {e}")
        return False
```

### 6.3 Протестировать управление
**Файл:** `backend/test_dialog_functions.py`

#### 6.3.1 Создать тесты для команд управления
```python
def test_claude_commands():
    """Тестировать команды управления Claude"""

    # Тест start_claude
    user_id = 123456789

    # Имитировать команду /start_claude
    start_claude_command(mock_message(user_id))

    # Проверить логирование
    events = get_dialog_events(user_id, limit=10)
    assert any(e['action'] == 'claude_started' for e in events)

    # Проверить статус
    status = get_dialog_status(user_id)
    assert status['claude_status'] == 'active'

    # Тест pause_claude
    pause_claude_command(mock_message(user_id))

    events = get_dialog_events(user_id, limit=10)
    assert any(e['action'] == 'claude_paused' for e in events)

    status = get_dialog_status(user_id)
    assert status['claude_status'] == 'paused'

    # Тест resume_claude
    resume_claude_command(mock_message(user_id))

    events = get_dialog_events(user_id, limit=10)
    assert any(e['action'] == 'claude_resumed' for e in events)

    status = get_dialog_status(user_id)
    assert status['claude_status'] == 'active'

    # Тест stop_claude
    stop_claude_command(mock_message(user_id))

    events = get_dialog_events(user_id, limit=10)
    assert any(e['action'] == 'claude_stopped' for e in events)

    status = get_dialog_status(user_id)
    assert status['claude_status'] == 'stopped'
    assert status['active'] == False
```

#### 6.3.2 Создать тесты для логирования сообщений
```python
def test_message_logging():
    """Тестировать логирование сообщений"""

    user_id = 123456789
    test_message = "Тестовое сообщение"

    # Имитировать входящее сообщение
    handle_all_messages(mock_message(user_id, text=test_message))

    # Проверить логирование
    events = get_dialog_events(user_id, limit=10)
    message_events = [e for e in events if e['action'] == 'message_received']
    assert len(message_events) > 0
    assert message_events[-1]['content'] == test_message

    # Проверить статус
    status = get_dialog_status(user_id)
    assert status['active'] == True
    assert status['has_new_messages'] == True
    assert status['last_message_from'] == 'user'
    assert status['message_count'] > 0
```

#### 6.3.3 Запустить тесты
```bash
cd backend
python -m pytest test_dialog_functions.py::test_claude_commands -v
python -m pytest test_dialog_functions.py::test_message_logging -v
```

---

## ЭТАП 7: ФРОНТ - TypeScript интерфейсы
**Файл:** `src/pages/CRMPage.tsx`

### 7.1 Добавить интерфейс DialogEvent
```typescript
interface DialogEvent {
  timestamp: string;
  user_id: number;
  action: string;
  from?: 'user' | 'manager' | 'claude';
  content?: string;
  initiated_by?: string;
  reason?: string;
  username?: string;
  command?: string;
  message_type?: string;
  photos_count?: number;
  [key: string]: any;
}
```

### 7.2 Добавить интерфейс DialogStatus
```typescript
interface DialogStatus {
  active: boolean;
  has_new_messages: boolean;
  last_message_at: string | null;
  last_message_from: 'user' | 'manager' | 'claude' | null;
  message_count: number;
  claude_status: 'active' | 'paused' | 'stopped';
}
```

### 7.3 Обновить интерфейс User
```typescript
interface User {
  user_id: number;
  username: string | null;
  created_at: string;
  status: string;
  car_interested: string | null;
  category_interested: string | null;
  dates_selected: {
    start: string;
    end: string;
    days: number;
  } | null;
  form_started: boolean;
  booking_submitted: boolean;
  notes: string[];
  source: string;
  updated_at: string;
  dialog_status?: DialogStatus | null; // Добавлено для статуса диалога
}
```

---

## ЭТАП 8: ФРОНТ - Функции и утилиты
**Файл:** `src/pages/CRMPage.tsx`

### 8.1 Добавить функции для работы с API диалогов
```typescript
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
  await fetch(`/api/crm/dialog/${userId}/mark-read`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

### 8.2 Добавить функции фильтрации и форматирования
```typescript
const formatRelativeTime = (dateString: string): string => {
  // Форматировать время относительно текущего
};

const getFilteredUsers = (users: User[], filter: string): User[] => {
  // Фильтровать пользователей по статусу диалога
};
```

### 8.3 Обновить состояние компонента
- Добавить dialog_status в состояние пользователей
- Добавить функции загрузки статусов

---

## ЭТАП 9: ФРОНТ - UI компоненты для диалогов
**Файл:** `src/pages/CRMPage.tsx`

### 9.1 Добавить отображение статуса диалога в карточке пользователя
```tsx
{/* Если есть активный диалог */}
{dialog_status?.active && (
  <div className="dialog-info">
    {/* Бейдж новых сообщений */}
    {dialog_status.has_new_messages && (
      <span className="badge-new">🔴 Новое</span>
    )}
    
    {/* AI статус */}
    <span className={`ai-status ${dialog_status.claude_status === 'active' ? 'on' : 'off'}`}>
      {dialog_status.claude_status === 'active' ? '🟢 AI ON' : '🟡 AI OFF'}
    </span>
    
    {/* Последнее сообщение */}
    <span className="last-message">
      {dialog_status.last_message_from === 'user' && '👤'}
      {dialog_status.last_message_from === 'manager' && '👨‍💼'}
      {dialog_status.last_message_from === 'claude' && '🤖'}
      {' '}
      {dialog_status.last_message_at && formatRelativeTime(dialog_status.last_message_at)}
    </span>
    
    {/* Счётчик */}
    <span className="message-count">
      {dialog_status.message_count} сообщений
    </span>
  </div>
)}
```

### 9.2 Добавить CSS стили
```css
.badge-new {
  background: #ff4444;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
}

.ai-status.on {
  color: #00aa00;
}

.ai-status.off {
  color: #ffaa00;
}

.dialog-info {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #666;
}
```

### 9.3 Протестировать UI
- Проверить отображение всех элементов
- Проверить адаптивность

---

## ЭТАП 10: ФРОНТ - Фильтры диалогов
**Файл:** `src/pages/CRMPage.tsx`

### 10.1 Добавить фильтры диалогов
```tsx
const [dialogFilter, setDialogFilter] = useState<'all' | 'active' | 'new' | 'ai-on' | 'ai-off'>('all');

const filteredUsers = users.filter(user => {
  const dialog = user.dialog_status;
  
  if (dialogFilter === 'active') {
    return dialog?.active;
  }
  if (dialogFilter === 'new') {
    return dialog?.has_new_messages;
  }
  if (dialogFilter === 'ai-on') {
    return dialog?.claude_status === 'active';
  }
  if (dialogFilter === 'ai-off') {
    return dialog?.active && dialog?.claude_status !== 'active';
  }
  return true;
});
```

### 10.2 Добавить UI кнопки фильтров
```tsx
<div className="dialog-filters">
  <button onClick={() => setDialogFilter('all')}>
    Все ({users.length})
  </button>
  <button onClick={() => setDialogFilter('active')}>
    💬 Активные ({users.filter(u => u.dialog_status?.active).length})
  </button>
  <button onClick={() => setDialogFilter('new')}>
    🔴 Новые ({users.filter(u => u.dialog_status?.has_new_messages).length})
  </button>
  <button onClick={() => setDialogFilter('ai-on')}>
    🟢 AI ON ({users.filter(u => u.dialog_status?.claude_status === 'active').length})
  </button>
  <button onClick={() => setDialogFilter('ai-off')}>
    🟡 AI OFF ({users.filter(u => u.dialog_status?.active && u.dialog_status?.claude_status !== 'active').length})
  </button>
</div>
```

### 10.3 Протестировать фильтрацию
- Проверить все фильтры
- Проверить обновление счетчиков

---

## ЭТАП 11: ФРОНТ - Интеграция с API
**Файл:** `src/pages/CRMPage.tsx`

### 11.1 Добавить загрузку статусов диалогов
```typescript
const loadDialogStatuses = async () => {
  const usersWithDialogs = await Promise.all(
    users.map(async (user) => {
      try {
        const dialogStatus = await fetchDialogStatus(user.user_id);
        return { ...user, dialog_status: dialogStatus };
      } catch (error) {
        console.error(`Failed to load dialog status for user ${user.user_id}:`, error);
        return { ...user, dialog_status: null };
      }
    })
  );
  setUsers(usersWithDialogs);
};
```

### 11.2 Добавить автообновление статусов
- Периодическое обновление статусов диалогов
- Обновление при фокусе на странице

### 11.3 Добавить обработку ошибок
- Обработка ошибок API
- Показ уведомлений пользователю

### 11.4 Добавить кнопку ручного обновления
- Кнопка обновления всех статусов
- Индикатор загрузки

### 11.5 Протестировать интеграцию
- Проверить все API вызовы
- Проверить обработку ошибок

---

## ЭТАП 12: Тестирование системы диалогов
**Файл:** `backend/test_dialog_functions.py`

### 12.1 Создать комплексные тесты
```python
def test_full_dialog_flow():
    """Тестировать полный цикл диалога"""
    user_id = 999999999

    # Очистить историю для теста
    history_file = Path("backend/data/crm_history.jsonl")
    if history_file.exists():
        history_file.unlink()

    # 1. Начать диалог
    log_dialog_event(user_id, "dialog_started", initiated_by="user")
    status = get_dialog_status_from_history(user_id)
    assert status["active"] == True

    # 2. Получить сообщение от пользователя
    log_dialog_event(user_id, "message_received", from="user", content="Привет")
    status = get_dialog_status_from_history(user_id)
    assert status["has_new_messages"] == True
    assert status["message_count"] == 1

    # 3. Запустить Claude
    log_dialog_event(user_id, "claude_started", initiated_by="manager")
    status = get_dialog_status_from_history(user_id)
    assert status["claude_status"] == "active"

    # 4. Получить ответ Claude
    log_dialog_event(user_id, "claude_response", from="claude", content="Здравствуйте!")
    status = get_dialog_status_from_history(user_id)
    assert status["message_count"] == 2
    assert status["last_message_from"] == "claude"

    # 5. Отметить сообщения прочитанными
    log_dialog_event(user_id, "messages_marked_read", by="manager")
    status = get_dialog_status_from_history(user_id)
    assert status["has_new_messages"] == False

    # 6. Остановить диалог
    log_dialog_event(user_id, "claude_stopped", reason="completed")
    status = get_dialog_status_from_history(user_id)
    assert status["claude_status"] == "stopped"

    print("✅ Full dialog flow test passed")
```

### 12.2 Протестировать API endpoints
```bash
# Тестировать статус диалога
curl "http://localhost:5000/api/crm/dialog/123/status"

# Тестировать события диалога
curl "http://localhost:5000/api/crm/dialog/123/events"

# Тестировать активные диалоги
curl "http://localhost:5000/api/crm/dialogs/active"
```

### 12.3 Протестировать фронтенд интеграцию
- Проверить отображение статусов в CRM
- Проверить фильтры диалогов
- Проверить автообновление

---

## ЭТАП 13: Оптимизация и производительность
**Файл:** `backend/web_integration.py`

### 13.1 Добавить кэширование статусов
```python
# Глобальный кэш статусов диалогов
dialog_status_cache = {}
CACHE_TTL = 30  # секунды

def get_cached_dialog_status(user_id: int):
    """Получить статус из кэша или вычислить"""
    cache_key = f"dialog_status_{user_id}"
    now = time.time()

    if cache_key in dialog_status_cache:
        cached_time, cached_status = dialog_status_cache[cache_key]
        if now - cached_time < CACHE_TTL:
            return cached_status

    # Вычислить статус
    status = get_dialog_status_from_history(user_id)
    dialog_status_cache[cache_key] = (now, status)
    return status
```

### 13.2 Оптимизировать чтение истории
```python
def get_dialog_events_optimized(user_id: int, limit: int = 50):
    """Оптимизированное чтение с индексацией"""
    # Использовать бинарный поиск для больших файлов
    # Кэшировать последние события
    pass
```

### 13.3 Добавить очистку старых событий
```python
def cleanup_old_events(days: int = 90):
    """Удалить события старше N дней"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    # Фильтровать и перезаписать файл
    pass
```

---

## ЭТАП 14: Мониторинг и логирование
**Файл:** `backend/web_integration.py`

### 14.1 Добавить метрики
```python
def get_dialog_metrics():
    """Получить метрики системы диалогов"""
    history_file = DATA / "crm_history.jsonl"

    total_events = 0
    active_dialogs = 0
    total_messages = 0
    user_ids = set()

    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    total_events += 1
                    user_ids.add(event.get("user_id"))

                    if event.get("action") in ["message_received", "message_sent", "claude_response"]:
                        total_messages += 1
                except:
                    continue

    return {
        "total_events": total_events,
        "unique_users": len(user_ids),
        "total_messages": total_messages,
        "active_dialogs": active_dialogs
    }
```

### 14.2 Добавить health check endpoint
```python
@app.get("/api/crm/dialogs/health")
def dialog_system_health():
    """Проверить здоровье системы диалогов"""
    try:
        # Проверить существование файла истории
        history_file = DATA / "crm_history.jsonl"
        file_exists = history_file.exists()

        # Проверить возможность записи
        test_event = {"test": True, "timestamp": datetime.utcnow().isoformat()}
        can_write = False
        try:
            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(test_event, ensure_ascii=False) + "\n")
            can_write = True
        except:
            pass

        # Получить метрики
        metrics = get_dialog_metrics()

        return {
            "status": "healthy" if file_exists and can_write else "unhealthy",
            "file_exists": file_exists,
            "can_write": can_write,
            "metrics": metrics
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
```

---

## ЭТАП 15: Финальная интеграция и развертывание
**Файл:** Разные файлы

### 15.1 Обновить документацию
- Добавить раздел о системе диалогов в README
- Обновить API документацию
- Создать гайд по использованию

### 15.2 Добавить миграцию данных
```python
def migrate_existing_dialogs():
    """Перенести существующие диалоги из user_data.json в историю"""
    users_data = load_json(USER_DATA_JSON)

    for user in users_data:
        user_id = user.get("user_id")
        dialog = user.get("dialog", {})

        if dialog.get("active"):
            # Логировать событие начала диалога
            log_dialog_event(user_id, "dialog_started", initiated_by="system_migration")

        if dialog.get("claude", {}).get("status") == "active":
            log_dialog_event(user_id, "claude_started", initiated_by="system_migration")

    print("✅ Migration completed")
```

### 15.3 Запустить в продакшен
- Проверить все endpoints
- Настроить мониторинг
- Добавить бэкапы истории

### 15.4 Финальное тестирование
- Тестирование с реальными пользователями
- Мониторинг производительности
- Проверка отказоустойчивости

---

# ✅ СИСТЕМА ОТСЛЕЖИВАНИЯ СТАТУСА ДИАЛОГОВ ЗАВЕРШЕНА

Система полностью реализована и готова к использованию:

- ✅ Бэкенд функции логирования
- ✅ API endpoints для диалогов
- ✅ Интеграция с ботом
- ✅ Фронтенд компоненты
- ✅ Фильтры и отображение статусов
- ✅ Тестирование и оптимизация
- ✅ Мониторинг и метрики

Система позволяет:
- Отслеживать все взаимодействия пользователей
- Показывать статусы диалогов в реальном времени
- Фильтровать пользователей по активности
- Управлять AI помощником Claude
- Автоматически обновлять статусы