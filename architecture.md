# Sunny Rentals Architecture

## CRM System Overview

### Воронка статусов
```
NEW → IN_WORK → PREBOOKING → BOOK → ARCHIVE
```

### Статусы
| Статус | Описание |
|--------|----------|
| NEW | Новый лид |
| IN_WORK | В работе |
| PREBOOKING | Предбронь (есть заявка, но не подтверждена) |
| BOOK | Бронь подтверждена |
| ARCHIVE | В архиве (не удалён из системы) |

### Индикатор archived
- `archived: false` — лид в системе (user_data.json)
- `archived: true` — полностью удалён (archive.json)

---

## API Endpoints

### CRM Users
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crm/users` | GET | Получить всех пользователей с фильтрами |
| `/api/crm/stats` | GET | Статистика по статусам |
| `/api/crm/users/{id}` | GET | Получить одного пользователя |

### User Status
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crm/update_status` | POST | Изменить статус пользователя |
| `/api/crm/set_marker` | POST | Установить маркер (offer_sent, waiting, need_info, follow_up) |
| `/api/crm/add_note` | POST | Добавить заметку |

### Archive
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crm/delete_user/{user_id}` | DELETE | Переместить в архив (status → archive, archived → false) |
| `/api/crm/permanent_delete/{user_id}` | DELETE | Полное удаление (archived → true, archive.json) |
| `/api/crm/restore_user/{user_id}` | POST | Восстановить из архива |

### Bookings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/bookings` | GET | Получить все бронирования |
| `/api/admin/bookings/{id}/confirm` | POST | Подтвердить бронь |
| `/api/admin/bookings/{id}/reject` | POST | Отклонить бронь |
| `/api/admin/bookings/{id}/status` | POST | Изменить статус брони |

---

## Database Files

| File | Описание |
|------|----------|
| `data/user_data.json` | Основная база пользователей |
| `data/bookings.json` | Бронирования |
| `data/crm_history.jsonl` | История изменений CRM |
| `data/archive.json` | Полностью удалённые пользователи |
| `data/chat_logs.jsonl` | Логи чатов Claude |

---

## Frontend Components

### CRMPage.tsx
- **Stats Section** — 5 вкладок (NEW, WORK, PBOOK, BOOK, ARCHIVE)
- **Marker Filters** — фильтры по маркерам (Send, Clock, FileQuestion, RefreshCw)
- **User Cards** — карточки пользователей с переключателями статусов
- **Booking Actions** — кнопки подтверждения/отклонения брони

### Индикаторы
| Индикатор | Условие |
|-----------|---------|
| 🔴 Красная точка | Есть непрочитанные сообщения |
| 🟢 Зелёная иконка User | Есть active бронь (pre_booking или confirmed) |
| 🟢 Зелёная кнопка чата | Есть сообщения в диалоге |
| 🟡 Синяя кнопка чата | Нет сообщений |

---

## Логика архивирования

### Архивировать (Trash вкладки NEW/WORK/PBOOK/BOOK)
- `status` → `'archive'`
- `archived` → `false`
- Пользователь остаётся в `user_data.json`
- Появляется во вкладке ARCHIVE

### Удалить навсегда (Trash вкладки ARCHIVE)
- `archived` → `true`
- Удаляется из `user_data.json`
- Записывается в `archive.json`

---

## Маркеры (бизнес-логика)

| Маркер | Иконка | Цвет | Описание |
|--------|--------|------|----------|
| offer_sent | Send | 🟡 янтарный | Оффер отправлен |
| waiting | Clock | 🟣 фиолетовый | Клиент думает |
| need_info | FileQuestion | 🟣 циан | Нужна информация |
| follow_up | RefreshCw | 🔴 красный | Требуется follow-up |

---

## Коммиты (2026-03-07)

| Хеш | Описание |
|-----|----------|
| `fb68d13` | Добавлен статус confirmed для лидов |
| `5d926df` | Добавлена вкладка Confirmed |
| `8ee7241` | Переименование функций |
| `f4adcf8` | Автоматический переход в confirmed при подтверждении брони |
| `63e8d09` | Исправление счётчиков |
| `1c12b3c` | Использование status=confirmed |
| `d8d1ab8` | Индикатор active брони + логика reject |
| `71cc9b6` | Компактный layout + одна кнопка reject для confirmed |
| `4f47e65` | CONF → BOOK + иконки маркеров |
| `b42c25a` | Двухуровневая логика архивирования |

---

## Последняя сессия (2026-03-07)

### Что реализовано:
1. **Вкладка BOOK** — лиды с confirmed бронями
2. **Автоматический переход** в BOOK при подтверждении брони
3. **Логика отклонения:**
   - pre_booking → archive
   - confirmed → in_work (если нет других confirmed брони)
4. **Зелёная иконка User** — если есть active бронь
5. **Компактные вкладки** — label сверху, count снизу
6. **Единые иконки маркеров** — Send, Clock, FileQuestion, RefreshCw
7. **Двухуровневое архивирование:**
   - Trash вкладки NEW/WORK/PBOOK/BOOK → status: archive, archived: false
   - Trash вкладки ARCHIVE → archived: true, полное удаление в archive.json

### Новые API эндпоинты:
- `DELETE /api/crm/permanent_delete/{user_id}` — полное удаление
- `POST /api/crm/update_status` — теперь принимает параметр `archived`

### Изменения в UI:
- CONF → BOOK (яснее: PBOOK = предбронь, BOOK = бронь)
- Переключатели статусов плотнее (gap-px)
- Компактные вкладки статистики (5 колонок)
- Кнопка Telegram всегда синяя (без логики)
- Только одна кнопка "Отклонить" для confirmed брони