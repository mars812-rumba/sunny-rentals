# ПРОМПТ ДЛЯ СЛЕДУЮЩЕЙ ВЕТКИ: Интеграция системы отслеживания статуса диалогов

## 📋 КОНТЕКСТ
Мы работаем над rental CRM системой с бэкендом (FastAPI) и фронтом (React). Бот на Flask отдельно, но работает с теми же файлами что и бэкенд.

## 🎯 ЗАДАЧА
Добавить систему отслеживания статуса диалогов, используя **ПРАВИЛЬНУЮ АРХИТЕКТУРУ**:
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

## 🚀 ЧТО НУЖНО СДЕЛАТЬ

### ЭТАП 1: БЭКЕНД - Функции работы с историей диалогов
**Файл:** `backend/web_integration.py`

#### 1.1 Добавить функции в конец файла (перед `# ЗАПУСК`):

```python
# ==============================
# DIALOG HISTORY MANAGEMENT FUNCTIONS
# ==============================

def log_dialog_event(user_id: int, action: str, **kwargs):
    """
    Логирует событие диалога в crm_history.jsonl
    
    Параметры:
    - action: str - тип события (dialog_started, message_received, message_sent, claude_started, etc.)
    - **kwargs: дополнительные данные события
    """
    try:
        print(f"📝 Logging dialog event: {action} for user {user_id}")
        
        # Создаем запись события
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,
            **kwargs
        }
        
        # Записываем в файл истории
        history_file = DATA / "crm_history.jsonl"
        with open(history_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        
        print(f"✅ Dialog event logged: {action} for user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error logging dialog event: {e}")
        import traceback
        traceback.print_exc()
        return False

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
    try:
        print(f"🔍 Getting dialog status from history for user {user_id}")
        
        history_file = DATA / "crm_history.jsonl"
        if not history_file.exists():
            return {
                "active": False,
                "has_new_messages": False,
                "last_message_at": None,
                "last_message_from": None,
                "message_count": 0,
                "claude_status": "stopped"
            }
        
        # Читаем историю и фильтруем по user_id
        dialog_events = []
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get("user_id") == user_id:
                        dialog_events.append(event)
                except json.JSONDecodeError:
                    continue
        
        if not dialog_events:
            return {
                "active": False,
                "has_new_messages": False,
                "last_message_at": None,
                "last_message_from": None,
                "message_count": 0,
                "claude_status": "stopped"
            }
        
        # Сортируем по времени (новые сверху)
        dialog_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Анализируем события
        active = False
        has_new_messages = False
        last_message_at = None
        last_message_from = None
        message_count = 0
        claude_status = "stopped"
        
        # Счетчики для определения активности
        recent_events = []
        message_events = []
        claude_events = []
        
        for event in dialog_events:
            action = event.get("action", "")
            timestamp = event.get("timestamp", "")
            
            # Собираем события за последние 24 часа для определения активности
            try:
                event_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                if (datetime.utcnow() - event_time).days < 1:
                    recent_events.append(event)
            except:
                pass
            
            # Собираем сообщения
            if action in ["message_received", "message_sent", "claude_response"]:
                message_events.append(event)
                message_count += 1
                
                # Определяем последнее сообщение
                if not last_message_at or timestamp > last_message_at:
                    last_message_at = timestamp
                    if action == "message_received":
                        last_message_from = event.get("from", "user")
                    elif action == "message_sent":
                        last_message_from = event.get("from", "manager")
                    elif action == "claude_response":
                        last_message_from = "claude"
            
            # Собираем события Claude
            if action in ["claude_started", "claude_paused", "claude_resumed", "claude_stopped"]:
                claude_events.append(event)
        
        # Определяем активность диалога
        # Диалог активен если есть события за последние 24 часа
        active = len(recent_events) > 0
        
        # Определяем статус Claude
        if claude_events:
            latest_claude_event = claude_events[0]  # уже отсортированы по времени
            claude_action = latest_claude_event.get("action", "")
            if claude_action == "claude_started":
                claude_status = "active"
            elif claude_action == "claude_paused":
                claude_status = "paused"
            elif claude_action == "claude_resumed":
                claude_status = "active"
            elif claude_action == "claude_stopped":
                claude_status = "stopped"
        
        # Определяем новые сообщения
        # Считаем сообщения от пользователя после последнего "messages_marked_read"
        last_marked_read = None
        for event in dialog_events:
            if event.get("action") == "messages_marked_read":
                last_marked_read = event.get("timestamp")
                break
        
        if last_marked_read:
            for event in message_events:
                if event.get("timestamp") > last_marked_read and event.get("from") == "user":
                    has_new_messages = True
                    break
        else:
            # Если никогда не помечали как прочитанное, считаем все сообщения новыми
            has_new_messages = any(event.get("from") == "user" for event in message_events)
        
        result = {
            "active": active,
            "has_new_messages": has_new_messages,
            "last_message_at": last_message_at,
            "last_message_from": last_message_from,
            "message_count": message_count,
            "claude_status": claude_status
        }
        
        print(f"✅ Dialog status for user {user_id}: {result}")
        return result
        
    except Exception as e:
        print(f"❌ Error getting dialog status for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return {
            "active": False,
            "has_new_messages": False,
            "last_message_at": None,
            "last_message_from": None,
            "message_count": 0,
            "claude_status": "stopped"
        }

def get_dialog_events(user_id: int, limit: int = 50):
    """
    Получает историю событий диалога пользователя
    """
    try:
        print(f"📋 Getting dialog events for user {user_id}, limit: {limit}")
        
        history_file = DATA / "crm_history.jsonl"
        if not history_file.exists():
            return []
        
        # Читаем историю и фильтруем по user_id
        all_events = []
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    if event.get("user_id") == user_id:
                        all_events.append(event)
                except json.JSONDecodeError:
                    continue
        
        # Сортируем по времени (новые сверху) и ограничиваем количество
        all_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        events = all_events[:limit]
        
        print(f"✅ Found {len(events)} dialog events for user {user_id}")
        return events
        
    except Exception as e:
        print(f"❌ Error getting dialog events for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return []
```

#### 1.2 Протестировать функции
Создать тестовый скрипт для проверки функций.

### ЭТАП 2: БЭКЕНД - API Endpoints для диалогов
**Файл:** `backend/web_integration.py`

#### 2.1 Добавить endpoints перед `# ЗАПУСК`:

```python
# ==============================
# DIALOG API ENDPOINTS
# ==============================

@app.get("/api/crm/dialog/{user_id}/status")
def get_dialog_status_endpoint(user_id: int):
    """Получить статус диалога из истории"""
    try:
        dialog_status = get_dialog_status_from_history(user_id)
        return {"dialog": dialog_status}
    except Exception as e:
        print(f"❌ Error in get_dialog_status_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/dialog/{user_id}/events")
def get_dialog_events_endpoint(user_id: int, limit: int = Query(50, ge=1, le=200)):
    """Получить историю событий диалога"""
    try:
        events = get_dialog_events(user_id, limit)
        return {"events": events, "total": len(events)}
    except Exception as e:
        print(f"❌ Error in get_dialog_events_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/crm/dialog/{user_id}/mark-read")
def mark_dialog_read(user_id: int):
    """Сбросить флаг новых сообщений когда менеджер открыл чат"""
    try:
        log_dialog_event(
            user_id=user_id,
            action="messages_marked_read",
            by="manager"
        )
        return {"status": "ok"}
    except Exception as e:
        print(f"❌ Error in mark_dialog_read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/dialogs/active")
def get_active_dialogs():
    """Получить список всех активных диалогов"""
    try:
        history_file = DATA / "crm_history.jsonl"
        if not history_file.exists():
            return {"active_dialogs": [], "total": 0}
        
        # Читаем всю историю
        user_dialogs = {}
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    event = json.loads(line.strip())
                    user_id = event.get("user_id")
                    if user_id:
                        if user_id not in user_dialogs:
                            user_dialogs[user_id] = []
                        user_dialogs[user_id].append(event)
                except json.JSONDecodeError:
                    continue
        
        # Находим активные диалоги
        active_dialogs = []
        for user_id, events in user_dialogs.items():
            # Сортируем события пользователя по времени
            events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            
            # Проверяем активность (события за последние 24 часа)
            recent_events = []
            for event in events:
                try:
                    event_time = datetime.fromisoformat(event.get("timestamp", "").replace('Z', '+00:00'))
                    if (datetime.utcnow() - event_time).days < 1:
                        recent_events.append(event)
                except:
                    pass
            
            if recent_events:
                # Получаем статус диалога
                dialog_status = get_dialog_status_from_history(user_id)
                active_dialogs.append({
                    "user_id": user_id,
                    "dialog_status": dialog_status,
                    "recent_events_count": len(recent_events)
                })
        
        return {
            "active_dialogs": active_dialogs,
            "total": len(active_dialogs)
        }
        
    except Exception as e:
        print(f"❌ Error in get_active_dialogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

#### 2.2 Протестировать endpoints
Проверить работу через curl или Postman.

### ЭТАП 3: БЭКЕНД - Интеграция с существующими функциями
**Файл:** `backend/web_integration.py`

#### 3.1 Обновить notify_telegram_bot_about_webapp_opened()
Найти функцию и добавить:

```python
# ✅ ДОБАВИТЬ В КОНЕЦ ФУНКЦИИ, после успешного ответа бота:
log_dialog_event(
    user_id=user_id,
    action="dialog_started",
    initiated_by="user",
    username=username
)
```

#### 3.2 Обновить notify_telegram_bot_about_filters_used()
Найти функцию и добавить:

```python
# ✅ ДОБАВИТЬ В КОНЕЦ ФУНКЦИИ, после успешного ответа бота:
log_dialog_event(
    user_id=user_id,
    action="dialog_continued",
    initiated_by="user",
    event_type="filters_used",
    filters=filters,
    username=username
)
```

#### 3.3 Обновить notify_telegram_bot_about_booking()
Найти функцию и добавить:

```python
# ✅ ДОБАВИТЬ В КОНЕЦ ФУНКЦИИ, после успешного ответа бота:
log_dialog_event(
    user_id=user_id,
    action="booking_submitted",
    initiated_by="user",
    booking_id=booking_id,
    form_data=form_data,
    username=username
)
```

### ЭТАП 4: БЭКЕНД - Claude интеграция
**Файл:** `backend/web_integration.py`

#### 4.1 Обновить Claude endpoints
Найти все Claude endpoints и добавить логирование:

```python
# В /api/claude/start добавить:
log_dialog_event(
    user_id=user_id,
    action="claude_started",
    initiated_by="manager"
)

# В /api/claude/stop добавить:
log_dialog_event(
    user_id=user_id,
    action="claude_stopped",
    reason="manager_stop"
)

# В /api/claude/pause добавить:
log_dialog_event(
    user_id=user_id,
    action="claude_paused",
    reason="manager_pause"
)

# В /api/claude/resume добавить:
log_dialog_event(
    user_id=user_id,
    action="claude_resumed",
    initiated_by="manager"
)
```

### ЭТАП 5: БОТ - Обработчики сообщений
**Файл:** `backend/telegram_bot.py`

#### 5.1 Добавить обработчики сообщений пользователей
Найти место где обрабатываются сообщения от пользователей и добавить:

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

#### 5.2 Добавить обработчики сообщений менеджеров
Найти место где обрабатываются сообщения от менеджеров и добавить:

```python
# Когда менеджер отправляет сообщение из CRM:
log_dialog_event(
    user_id=user_id,
    action="message_sent",
    from="manager",
    content=message_text
)
```

#### 5.3 Добавить обработчики Claude ответов
Найти место где обрабатываются ответы Claude и добавить:

```python
# Когда Claude отправляет ответ:
log_dialog_event(
    user_id=user_id,
    action="claude_response",
    from="claude",
    content=response_text
)
```

### ЭТАП 6: ФРОНТ - TypeScript интерфейсы
**Файл:** `src/pages/CRMPage.tsx`

#### 6.1 Добавить интерфейсы
В начало файла добавить:

```typescript
interface DialogEvent {
  timestamp: string;
  user_id: number;
  action: string;
  from?: 'user' | 'manager' | 'claude';
  content?: string;
  initiated_by?: string;
  reason?: string;
  [key: string]: any;
}

interface DialogStatus {
  active: boolean;
  has_new_messages: boolean;
  last_message_at: string | null;
  last_message_from: 'user' | 'manager' | 'claude' | null;
  message_count: number;
  claude_status: 'active' | 'paused' | 'stopped';
}

interface User {
  user_id: number;
  username: string;
  // ... остальные поля из user_data.json
  dialog_status?: DialogStatus; // Получаем из API
}
```

#### 6.2 Добавить функции для работы с API
Добавить функции:

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

#### 6.3 Добавить отображение статуса диалога
В компоненте UserCard добавить:

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

#### 6.4 Добавить CSS стили
В src/index.css добавить:

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

#### 6.5 Добавить фильтры диалогов
Добавить состояние и логику фильтрации:

```typescript
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

#### 6.6 Добавить UI кнопки фильтров
Добавить в интерфейс:

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

## 📝 ТРЕБОВАНИЯ

- Не ломать существующую функциональность
- Использовать существующие helper функции (load_json, save_json)
- Добавить логирование (print) в функции работы с историей
- Все datetime в ISO 8601 формате
- Использовать правильную архитектуру: user_data.json = статика, crm_history.jsonl = динамика

## 📁 ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ

- **backend/web_integration.py** - добавить функции работы с историей и endpoints
- **backend/telegram_bot.py** - добавить обработчики сообщений и логирование
- **src/pages/CRMPage.tsx** - добавить интерфейсы, UI для отображения статусов, фильтры
- **src/index.css** - добавить стили для новых элементов

## 🚀 ПОРЯДОК ВЫПОЛНЕНИЯ

1. **ЭТАП 1**: Бэкенд - функции работы с историей (web_integration.py)
2. **ЭТАП 2**: Бэкенд - API endpoints для диалогов
3. **ЭТАП 3**: Бэкенд - интеграция с существующими функциями
4. **ЭТАП 4**: Бэкенд - Claude интеграция
5. **ЭТАП 5**: Бот - обработчики сообщений (telegram_bot.py)
6. **ЭТАП 6**: Фронт - TypeScript интерфейсы и UI (CRMPage.tsx)

## ✅ КРИТЕРИИ УСПЕХА

1. **Функциональность:**
   - ✅ События диалогов сохраняются в crm_history.jsonl
   - ✅ Статусы диалогов вычисляются из истории
   - ✅ API endpoints работают корректно
   - ✅ Фронтенд отображает статусы

2. **UI/UX:**
   - ✅ Бейджи новых сообщений
   - ✅ Индикаторы AI статуса
   - ✅ Фильтры работают
   - ✅ Responsive дизайн

3. **Производительность:**
   - ✅ Быстрая загрузка
   - ✅ Плавные переходы
   - ✅ Оптимизированные запросы

4. **Надежность:**
   - ✅ Обработка ошибок
   - ✅ Валидация данных
   - ✅ Логирование действий

## 🧪 ТЕСТИРОВАНИЕ

После каждого этапа обязательно тестировать:
1. Функции работы с историей
2. API endpoints
3. Интеграцию с существующими функциями
4. Claude интеграцию
5. Обработчики бота
6. Отображение во фронтенде

Начинай с ЭТАПА 1 и последовательно выполняй все этапы!