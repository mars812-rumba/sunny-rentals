#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестирование интеграции функций уведомления бота
ЭТАП 2.4: Протестировать интеграцию
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Добавляем путь к модулям
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from web_integration import (
    log_dialog_event, 
    get_dialog_status_from_history, 
    get_dialog_events, 
    notify_telegram_bot_about_webapp_opened,
    notify_telegram_bot_about_filters,
    notify_telegram_bot_about_booking,
    DATA
)

def test_integration():
    """Тестирование интеграции функций уведомления бота"""
    print("🧪 Начинаем тестирование интеграции функций уведомления бота...")
    
    # Тестовый user_id
    test_user_id = 987654321
    
    # Очищаем файл истории для чистого теста
    history_file = DATA / "crm_history.jsonl"
    if history_file.exists():
        os.remove(history_file)
        print("🗑️ Очистили файл истории для теста")
    
    # === ТЕСТ 1: notify_telegram_bot_about_webapp_opened ===
    print("\n📱 ТЕСТ 1: notify_telegram_bot_about_webapp_opened")
    
    try:
        result = notify_telegram_bot_about_webapp_opened(test_user_id, "test_user")
        print(f"✅ Результат: {result}")
        
        # Проверяем что событие записано в историю
        status = get_dialog_status_from_history(test_user_id)
        print(f"📋 Статус после webapp_opened:")
        print(f"   Активен: {status['active']}")
        print(f"   Последнее сообщение от: {status['last_message_from']}")
        
        events = get_dialog_events(test_user_id, limit=5)
        print(f"📚 События в истории: {len(events)}")
        for event in events:
            print(f"   - {event['action']}: {event.get('initiated_by', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Ошибка в тесте webapp_opened: {e}")
    
    # === ТЕСТ 2: notify_telegram_bot_about_filters ===
    print("\n🌡️ ТЕСТ 2: notify_telegram_bot_about_filters")
    
    try:
        test_filters = {
            "category": "sedan",
            "startDate": "2026-01-15",
            "endDate": "2026-01-20",
            "days": 5
        }
        
        result = notify_telegram_bot_about_filters(test_user_id, test_filters, "test_user")
        print(f"✅ Результат: {result}")
        
        # Проверяем что событие записано в историю
        status = get_dialog_status_from_history(test_user_id)
        print(f"📋 Статус после filters_used:")
        print(f"   Активен: {status['active']}")
        print(f"   Количество сообщений: {status['message_count']}")
        
        events = get_dialog_events(test_user_id, limit=10)
        print(f"📚 События в истории: {len(events)}")
        for event in events:
            if event['action'] == 'dialog_continued':
                print(f"   - {event['action']}: {event.get('event_type', 'N/A')}")
                print(f"     Фильтры: {event.get('filters', {})}")
            
    except Exception as e:
        print(f"❌ Ошибка в тесте filters: {e}")
    
    # === ТЕСТ 3: notify_telegram_bot_about_booking ===
    print("\n🔥 ТЕСТ 3: notify_telegram_bot_about_booking")
    
    try:
        test_booking_id = "BK_TEST_001"
        test_form_data = {
            "car": {
                "id": "test_car_001",
                "name": "Honda Civic 2024",
                "brand": "Honda",
                "model": "Civic",
                "year": "2024"
            },
            "dates": {
                "start": "2026-01-15T10:00:00Z",
                "end": "2026-01-20T10:00:00Z",
                "days": 5
            },
            "contact": {
                "name": "Test User",
                "phone": "+1234567890"
            }
        }
        
        result = notify_telegram_bot_about_booking(test_booking_id, test_user_id, test_form_data, "test_user")
        print(f"✅ Результат: {result}")
        
        # Проверяем что событие записано в историю
        status = get_dialog_status_from_history(test_user_id)
        print(f"📋 Статус после booking_submitted:")
        print(f"   Активен: {status['active']}")
        print(f"   Количество сообщений: {status['message_count']}")
        print(f"   Последнее сообщение от: {status['last_message_from']}")
        
        events = get_dialog_events(test_user_id, limit=15)
        print(f"📚 События в истории: {len(events)}")
        for event in events:
            if event['action'] == 'booking_submitted':
                print(f"   - {event['action']}: {event.get('booking_id', 'N/A')}")
                print(f"     Машина: {event.get('form_data', {}).get('car', {}).get('name', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Ошибка в тесте booking: {e}")
    
    # === ТЕСТ 4: Проверка полной истории ===
    print("\n📜 ТЕСТ 4: Проверка полной истории событий")
    
    try:
        all_events = get_dialog_events(test_user_id, limit=20)
        print(f"📊 Всего событий в истории: {len(all_events)}")
        
        print("\n📋 Полная хронология событий:")
        for i, event in enumerate(all_events, 1):
            timestamp = event.get('timestamp', '')
            action = event.get('action', '')
            initiated_by = event.get('initiated_by', 'N/A')
            print(f"   {i}. {timestamp} - {action} (инициировано: {initiated_by})")
        
        # Проверяем итоговый статус
        final_status = get_dialog_status_from_history(test_user_id)
        print(f"\n🎯 Итоговый статус диалога:")
        print(f"   Активен: {final_status['active']}")
        print(f"   Новые сообщения: {final_status['has_new_messages']}")
        print(f"   Всего сообщений: {final_status['message_count']}")
        print(f"   Последнее сообщение от: {final_status['last_message_from']}")
        print(f"   Статус Claude: {final_status['claude_status']}")
        
    except Exception as e:
        print(f"❌ Ошибка в тесте истории: {e}")
    
    print("\n🎉 Тестирование интеграции завершено!")
    
    # Показываем содержимое файла истории
    print("\n📄 Содержимое файла crm_history.jsonl:")
    if history_file.exists():
        with open(history_file, "r", encoding="utf-8") as f:
            content = f.read()
            if content.strip():
                lines = content.strip().split('\n')
                for i, line in enumerate(lines, 1):
                    try:
                        event = json.loads(line)
                        print(f"   {i}. {event.get('timestamp', 'N/A')} - {event.get('action', 'N/A')}")
                    except json.JSONDecodeError:
                        print(f"   {i}. [Ошибка парсинга JSON]")
            else:
                print("   (файл пуст)")
    else:
        print("   (файл не существует)")

if __name__ == "__main__":
    test_integration()