// src/types/crm.ts

export interface User {
  user_id: number;
  username: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  category_interested: string | null;
  vehicle_interested: string | null;
  car_interested?: string | null;  // Для совместимости
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
  
  // Маркеры для ручного управления менеджером
  marker?: string | null;
  
  // Старые поля для совместимости
  timestamp?: string;
  action?: string;
  final_status?: string;
  last_note?: string;
}

export interface ChatMessage {
  timestamp: string;
  role: 'user' | 'assistant';
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
  created_at: string;
}

export interface Stats {
  total_users: number;
  new?: number;           // ✅ Добавили новые статусы
  interested?: number;
  pending?: number;
  confirmed?: number;
  completed?: number;
  cancelled?: number;
  no_response?: number;
  
  // Старые статусы (для совместимости)
  in_progress?: number;
  warm?: number;
  hot?: number;
  archive?: number;
}

export type ClaudeStatus = 'inactive' | 'active' | 'paused' | 'stopped';

export type UserStatus =
  | 'new'
  | 'interested'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_response';

// Типы маркеров для ручного управления менеджером
export type MarkerType =
  | 'offer_sent'    // 📨 Оффер отправлен (ждём ответ)
  | 'waiting'       // ⏳ Клиент думает / ждём от него
  | 'need_info'     // 📎 Нужна доп. информация от нас
  | 'follow_up';    // 🔄 Follow-up (нужно написать)

export interface MarkerConfig {
  label: string;
  icon: string;  // Lucide icon name
  color: string;
  bgColor: string;
}

export const MARKER_CONFIGS: Record<MarkerType, MarkerConfig> = {
  offer_sent: {
    label: 'Оффер отправлен',
    icon: 'Send',
    color: '#f59e0b',
    bgColor: '#fef3c7'
  },
  waiting: {
    label: 'Клиент думает',
    icon: 'Clock',
    color: '#8b5cf6',
    bgColor: '#ede9fe'
  },
  need_info: {
    label: 'Нужна инфо',
    icon: 'FileQuestion',
    color: '#06b6d4',
    bgColor: '#cffafe'
  },
  follow_up: {
    label: 'Follow-up',
    icon: 'RefreshCw',
    color: '#ef4444',
    bgColor: '#fee2e2'
  }
};
    bgColor: '#dcfce7'
  },
  rejected: {
    label: 'Отказ',
    emoji: '❌',
    color: '#ef4444',
    bgColor: '#fee2e2'
  }
};