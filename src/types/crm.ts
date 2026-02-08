// src/types/crm.ts

// Типы статусов пользователя/лида
export type UserStatus =
  | 'new'         // 🆕 Все новые лиды (холодные + теплые)
  | 'in_work'     // 🔵 В работе менеджера (до confirmed)
  | 'pre_booking' // ⏳ Оффер отправлен, ждёт оплату/документы
  | 'confirmed'   // ✅ Оплаченные заявки
  | 'completed'   // ✅ Завершенные
  | 'cancelled'   // ❌ Отменённые
  | 'archive';    // 📁 Архив

// Конфигурация статусов для UI
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'new': { label: 'Новые', color: '#64748b', bg: 'bg-slate-100' },
  'in_work': { label: 'В работе', color: '#7c3aed', bg: 'bg-purple-50' },
  'pre_booking': { label: 'Предбронь', color: '#ea580c', bg: 'bg-orange-50' },
  'confirmed': { label: 'Подтверждено', color: '#10b981', bg: 'bg-emerald-50' },
  'completed': { label: 'Завершен', color: '#059669', bg: 'bg-green-100' },
  'cancelled': { label: 'Отменен', color: '#ef4444', bg: 'bg-red-100' },
  'archive': { label: 'Архив', color: '#94a3b8', bg: 'bg-slate-200' }
};

// Типы маркеров для управления менеджером (только для status = 'in_work')
export type MarkerType =
  | 'need_offer'   // 💰 Нужно отправить оффер
  | 'offer_sent'   // 📤 Оффер отправлен
  | 'follow_up'    // 🔔 Follow-up
  | 'need_new';    // ❓ Нужны новые данные

export interface MarkerConfig {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const MARKER_CONFIGS: Record<MarkerType, MarkerConfig> = {
  need_offer: {
    label: 'Нужен оффер',
    emoji: '💰',
    color: '#f59e0b',
    bgColor: '#fef3c7'
  },
  offer_sent: {
    label: 'Оффер отправлен',
    emoji: '📤',
    color: '#3b82f6',
    bgColor: '#dbeafe'
  },
  follow_up: {
    label: 'Follow-up',
    emoji: '🔔',
    color: '#8b5cf6',
    bgColor: '#ede9fe'
  },
  need_new: {
    label: 'Нужны данные',
    emoji: '❓',
    color: '#6b7280',
    bgColor: '#f3f4f6'
  }
};

export interface User {
  user_id: number;
  username: string | null;
  created_at: string;
  updated_at: string;
  status: UserStatus;
  category_interested: string | null;
  vehicle_interested: string | null;
  car_interested?: string | null;
  dates_selected: {
    start: string;
    end: string;
    days: number;
  } | null;
  form_started: boolean;
  booking_submitted: boolean;
  notes: string[];
  archived: boolean;
  archived_at: string | null;

  // Маркеры (только для status = 'in_work')
  marker?: MarkerType | null;

  // Старые поля для совместимости
  timestamp?: string;
  action?: string;
  final_status?: string;
  last_note?: string;
}

export interface ChatMessage {
  timestamp: string;
  role: 'user' | 'assistant' | 'manager';
  content: string;
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  note?: string;
  old_status?: string;
  new_status?: string;
}

export interface Booking {
  booking_id: string;
  user_id: number;
  form_data: {
    car: {
      id: string;
      name: string;
    };
    dates: {
      start: string;
      end: string;
      days: number;
    };
    pricing: {
      season: string;
      grandTotal: number;
    };
  };
  status: string;
  source?: 'telegram_webapp' | 'web_browser' | 'manager';
  created_at: string;
}

export interface Stats {
  total_users: number;
  new?: number;
  in_work?: number;
  pre_booking?: number;
  confirmed?: number;
  completed?: number;
  cancelled?: number;
  archive?: number;

  // Старые статусы (для совместимости)
  interested?: number;
  pending?: number;
  warm?: number;
  hot?: number;
  in_progress?: number;
}

export type ClaudeStatus = 'inactive' | 'active' | 'paused' | 'stopped';