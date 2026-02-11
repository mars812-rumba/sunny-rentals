# 🏎️ Sunny Rentals — Архитектура проекта

## 📁 Структура проекта

```
sunny-rentals/
├── src/
│   ├── api/                    # API клиент и функции запросов
│   │   └── api.ts             # Основной API (13.6 KB) - fetchCars, fetchBookings, etc.
│   ├── assets/                # Статические ресурсы
│   │   └── logo.png
│   ├── components/            # Переиспользуемые компоненты
│   │   ├── admin/             # Компоненты админки
│   │   │   └── CRM/           # CRM модуль
│   │   │       ├── BottomFilters.tsx
│   │   │       ├── LeadCard.tsx
│   │   │       ├── LeadDetailModal.tsx
│   │   │       └── StatusBar.tsx
│   │   ├── site/              # Компоненты публичного сайта
│   │   └── ui/                # UI kit (shadcn/ui)
│   ├── contexts/              # React Contexts
│   │   ├── CarsContext.tsx    # Контекст машин
│   │   └── LanguageContext.tsx # Контекст языка
│   ├── hooks/                 # Кастомные хуки
│   │   ├── useCalendarGrid.ts # Логика сетки календаря
│   │   └── useMediaQuery.ts
│   ├── locales/               # Локализация
│   ├── pages/                 # Страницы приложения
│   │   ├── AdminApp.tsx       # Главная админки
│   │   ├── AdminPanel.tsx     # Панель админа (57 KB)
│   │   ├── AdminScheduler.tsx # Календарь бронирований (10.9 KB)
│   │   ├── CarsPage.tsx       # Управление автопарком (56 KB)
│   │   ├── CRMPage.tsx        # CRM лиды (77 KB) ⭐ ГЛАВНАЯ СТРАНИЦА
│   │   ├── CrmPage_new.tsx    # Новая версия CRM
│   │   ├── Index.tsx          # Landing page (19 KB)
│   │   ├── LoginPage.tsx      # Авторизация
│   │   └── Site.tsx           # Публичный сайт
│   ├── types/                 # TypeScript типы
│   │   └── crm.ts             # Типы для CRM
│   ├── utils/                 # Утилиты
│   ├── App.tsx                # Главный компонент
│   └── main.tsx               # Точка входа
├── backend/                   # Python/FastAPI бэкенд
├── public/                    # Публичные файлы
├── package.json               # Зависимости
├── vite.config.ts             # Конфигурация Vite
└── tailwind.config.ts         # Конфигурация Tailwind
```

---

## 🎯 Основные модули

### 1. CRM (Customer Relationship Management)

**Главная страница:** `src/pages/CRMPage.tsx` (77 KB)

**Подкомпоненты:** `src/components/admin/CRM/`
- `LeadCard.tsx` — карточка лида в списке
- `LeadDetailModal.tsx` — детали лида + чат
- `BottomFilters.tsx` — фильтры внизу
- `StatusBar.tsx` — строка статусов

**Типы:** `src/types/crm.ts`
```typescript
interface User {
  user_id: number;
  status: string;          // new, interested, in_work, pending, confirmed, completed, archive
  marker?: string;         // unprocessed, in_progress, ready, rejected
  dialog_status?: DialogStatus;
  car_interested?: string;
  dates_selected?: { start: string; end: string; days: number };
  notes: string[];
  last_note?: string;
}

interface DialogStatus {
  active: boolean;
  has_new_messages: boolean;
  last_message_from: 'user' | 'manager' | 'claude';
  claude_status: 'active' | 'paused' | 'stopped';
  message_count: number;
}
```

**API функции:** `src/api/api.ts`
- `fetchUsers(status, period)` — получить лидов
- `fetchChats(userId)` — история чата
- `fetchBookings(userId)` — бронирования лида
- `updateMarker(userId, marker)` — обновить маркер
- `trackLeadEvent(eventType, data)` — трекинг событий

---

### 2. Календарь бронирований

**Страница:** `src/pages/AdminScheduler.tsx`

**Компоненты календаря:** `src/components/admin/`
- `SchedulerCalendar.tsx` — Gantt-вид (16 KB)
- `MonthCalendarView.tsx` — Месячный вид (10 KB)
- `DayDetailsModal.tsx` — детали дня

**Типы:**
```typescript
interface Booking {
  booking_id: string;
  user_id: number;
  form_data: BookingFormData;
  status: string;  // pending, confirmed, etc.
  source: 'telegram_webapp' | 'web_browser' | 'manager';
  created_at: string;
}

interface BookingFormData {
  car: Car;
  dates: { start: string; end: string; days: number };
  locations: { pickupLocation: string; returnLocation: string };
  pricing: { grandTotal: number; deposit: number };
  contact: { value: string; type: string };
}
```

**Логика:** `src/hooks/useCalendarGrid.ts`
- Управление сеткой дней
- Позиционирование баров бронирований
- Drag-n-drop для создания броней

---

### 3. Управление автопарком

**Страница:** `src/pages/CarsPage.tsx` (56 KB)

**Компоненты:** `src/components/`
- `CarForm.tsx` — форма добавления/редактирования авто (40 KB)
- `CarCard.tsx` — карточка авто
- `CarList.tsx` — список авто

**Типы авто:**
```typescript
interface Car {
  id: string;
  name: string;
  class: 'compact' | 'sedan' | 'suv' | '7s' | 'bikes';
  brand: string;
  model: string;
  year: string;
  color: string;
  available: boolean;
  photos: { main: string; gallery: string[] };
  pricing: {
    low_season: { price_1_6: number; price_7_14: number; ... };
    high_season: { price_1_6: number; price_7_14: number; ... };
    deposit: number;
  };
  specs: { fuel: string; engine: string; transmission: string };
  owner_id?: string;
}
```

---

## 🔄 Потоки данных

### CRM Flow
```
User opens page
    ↓
fetchUsers(status, period)
    ↓
Render LeadCard list
    ↓
Click on lead → open LeadDetailModal
    ↓
fetchChats(userId) + fetchBookings(userId)
    ↓
Manager sends message → POST /api/crm/message
    ↓
 claude_status toggle → POST /api/crm/claude/toggle
```

### Booking Flow
```
User selects car + dates
    ↓
submitBooking(formData)
    ↓
POST /api/admin/bookings
    ↓
SchedulerCalendar re-renders
    ↓
MonthCalendarView shows pickup/return events
```

---

## 🔗 Интеграции

### Telegram WebApp
- Определяется через `window.Telegram.WebApp`
- Используется для определения источника: `telegram_webapp`
- Тема автоматически синхронизируется

### API Endpoints (FastAPI)
```
GET  /api/cars                    # Список машин
GET  /api/bookings                # Список броней
GET  /api/bookings/logistics      # Логистика (пикапы/возвраты)
GET  /api/crm/users               # Лиды CRM
GET  /api/crm/chats/{userId}      # Чат лида
POST /api/crm/message             # Отправить сообщение
POST /api/crm/update_marker       # Обновить маркер
POST /api/admin/bookings          # Создать/обновить бронь
POST /api/leads/track             # Трекинг лидов
```

---

## 🛠 Технологический стек

| Категория | Технология |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State** | React Query (@tanstack/react-query) |
| **Router** | React Router 6 |
| **Calendar** | date-fns + embla-carousel |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts |

---

## 📊 Размеры ключевых файлов

| Файл | Размер | Описание |
|------|--------|----------|
| CRMPage.tsx | 77 KB | Главная CRM страница |
| CarsPage.tsx | 56 KB | Управление автопарком |
| AdminPanel.tsx | 57 KB | Панель админа |
| CarForm.tsx | 40 KB | Форма авто |
| BookingFormDialog.tsx | 36 KB | Форма брони |
| SchedulerCalendar.tsx | 16 KB | Gantt календарь |
| api.ts | 14 KB | API клиент |

---

## 🎨 UI Компоненты (shadcn/ui)

Используемые компоненты из `src/components/ui/`:
- Button, Card, Dialog, Select, Tabs
- Toast, ScrollArea, Badge
- Calendar, DropdownMenu
- И многие другие...

---

## 📱 Адаптивность

- **Мобильная версия:** `daysToShow = 14` в календаре
- **Десктоп:** `daysToShow = 30`
- Брейкпоинт: `768px`

---

## 🚀 Запуск

```bash
npm install          # Установить зависимости
npm run dev          # Dev server
npm run build        # Production build
npm run preview      # Preview production build
```

---

## 📝 TODO / notes

- Backend находится в `backend/` (FastAPI)
- API URL: `https://sunny-rentals.online`
- AUTH_TOKEN настраивается через `.env`
- Есть несколько версий CRM страниц (CRMPage(OLD).tsx, CRMPage_debug_fixes.tsx)