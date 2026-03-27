# Изменения для переноса в marsel-collab

## UI/UX улучшения

### 1. Валюта — иконка $ → Wallet ✅
**Файл:** `src/pages/CarsPage.tsx`
```diff
- import { ..., DollarSign, ... } from "lucide-react";
+ import { ..., Wallet, ... } from "lucide-react";
- <DollarSign className="h-3 w-3" />
+ <Wallet className="h-3 w-3" />
```

### 2. Карточка авто — все 4 цены ✅
**Файл:** `src/pages/CarsPage.tsx`
```diff
+ const price7_14 = seasonPrices.price_7_14 || 0;
+ const price30 = seasonPrices.price_30 || 0;
- <span>{price1_6}฿ • {price15_29}฿</span>
+ <span>{price1_6} · {price7_14} · {price15_29} · {price30}</span>
```

### 3. MonthCalendar — бейджи ✅
**Файл:** `src/components/admin/MonthCalendarView.tsx`

**Дни недели:**
```tsx
// Пн-Вт-Ср-Чт-Пт — серый, Сб-Вс — красный
{[
  { name: 'Пн', isWeekend: false },
  { name: 'Вт', isWeekend: false },
  { name: 'Ср', isWeekend: false },
  { name: 'Чт', isWeekend: false },
  { name: 'Пт', isWeekend: false },
  { name: 'Сб', isWeekend: true },
  { name: 'Вс', isWeekend: true }
].map((day, i) => (
  <div className={cn(
    "py-2 text-center text-[10px] font-bold uppercase",
    day.isWeekend ? "text-red-400" : "text-slate-500"
  )}>{day.name}</div>
))}
```

**Бейджи:**
- Максимум 4 бейджа в ячейке
- Высота: 13px
- Цвета: серый (pre_booking), зелёный (pickup), жёлтый (return)
- Без обводки
- "+ ещё N" для overflow (синий, кликабельный)

```tsx
// Бейдж
className="w-full h-[13px] px-1 text-[6px] font-medium cursor-pointer 
          hover:ring-1 hover:ring-blue-400 transition-all rounded-[2px] 
          flex items-center justify-center"

// Pre_booking цвет
const bgClass = isPreBooking
  ? "bg-slate-200 text-slate-600"
  : ev.type === 'pickup' 
    ? "bg-green-400 text-green-900"
    : "bg-yellow-400 text-yellow-900";

// Overflow
{events.length > 4 && (
  <div onClick={() => onDayClick(new Date(dayKey), events.slice(4), true)}>
    + ещё {events.length - 4}
  </div>
)}
```

**Popup с overflow:**
- Клик на "+ ещё N" открывает popup только с бейджами которые не влезли
- `isOverflowClick` флаг для отличия от клика на пустую ячейку

### 4. Gantt — скошенные края + тень ✅
**Файл:** `src/components/admin/SchedulerCalendar.tsx`
```tsx
style={{
  left: position.left + 2,
  width: position.width - 4,
  backgroundColor: bgColor,
  clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
}}
```

## Код исправления

### final_status removal ✅
**Фронтенд:** `src/pages/CRMPage.tsx`
```diff
- const currentStatus = user.final_status || user.status;
+ const currentStatus = user.status;
```

**Бэкенд:** `backend/web_integration.py`
```diff
- updates = {
-     'status': new_status,
-     'final_status': new_status,
-     'updated_at': datetime.utcnow().isoformat()
- }
+ updates = {
+     'status': new_status,
+     'updated_at': datetime.utcnow().isoformat()
+ }
```

### API_URL — пустой для relative paths ✅
**Файлы:** `src/api/api.ts`, `src/pages/*.tsx`, `src/components/**/*.tsx`
```diff
- const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
+ const API_URL = "";  // relative URL (works with nginx proxy)
```
(применено через sed замену http://localhost:5000 на пустую строку)

### pre_booking логика — return только для confirmed ✅
**Бэкенд:** `backend/web_integration.py` — `get_bookings_logistics()`
- pre_booking: только pickup_date, return_date пустой
- confirmed: создаётся pickup И return

### Исправление null Date в MonthCalendar ✅
**Фронтенд:** `src/components/admin/MonthCalendarView.tsx`
```tsx
const pDate = item.pickup_date ? new Date(item.pickup_date) : null;
const rDate = item.return_date ? new Date(item.return_date) : null;

if (!pDate || isNaN(pDate.getTime())) {
  // пропускаем
} else {
  // добавляем pickup
}

if (rDate && !isNaN(rDate.getTime())) {
  // добавляем return
}
```

## Демо-данные

### web_cars.json — структура с specs ✅
**Файл:** `backend/data/demo/web_cars.json`
```json
{
  "id": "honda_crv_2024_white",
  "name": "Honda CR-V 2024 White",
  "class": "suv",
  "specs": {
    "fuel": "hybrid",
    "transmission": "automatic",
    "seats": 5,
    "power": "190 л.с.",
    "engine": "2.0L"
  },
  "pricing": {
    "low_season": { "price_1_6": 1800, "price_7_14": 1600, "price_15_29": 1450, "price_30": 1300 },
    "high_season": { "price_1_6": 2200, "price_7_14": 2000, "price_15_29": 1800, "price_30": 1600 },
    "deposit": 10000
  }
}
```

### user_data.json — demo лиды ✅
**Файл:** `backend/data/demo/user_data.json`
- 10 лидов с chat_logs.jsonl (29 сообщений)
- Структура как в основном проекте

## Скрипты

### build-and-restart.sh
```bash
#!/bin/bash
cd /home/rentmanager
npm run build
pkill -f "web_integration.py" 2>/dev/null
sleep 1
cd /home/rentmanager/backend
source .env_demo
nohup python3 web_integration.py > /tmp/demo_backend.log 2>&1 &
```

### restart-demo.sh
```bash
#!/bin/bash
pkill -f "web_integration.py" 2>/dev/null
sleep 1
cd /home/rentmanager/backend
source .env_demo
nohup python3 web_integration.py > /tmp/demo_backend.log 2>&1 &
```

## Известные баги

### Баг с редактированием брони
- При изменении брони пропадает марка авто из названия
- Бейджик в высоте увеличивается
- **Статус:** НЕ ИСПРАВЛЕНО

## Демо URLs
- https://demo.sunny-rentals.online/ — витрина
- https://demo.sunny-rentals.online/admin/app — админка
- Backend: localhost:5002
