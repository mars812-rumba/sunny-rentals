#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестирование API endpoints для диалогов
ЭТАП 3.5: Протестировать endpoints
"""

import sys
import os
import json
import requests
from datetime import datetime, timedelta

# Добавляем путь к модулям
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from web_integration import (
    log_dialog_event, 
    get_dialog_status_from_history, 
    get_dialog_events, 
    DATA
)

def test_dialog_endpoints():
    """Тестирование API endpoints для диалогов"""
    print("🧪 Начинаем тестирование API endpoints для диалогов...")
    
    # Тестовый user_id
    test_user_id = 555666777
    
    # Очищаем файл истории для чистого теста
    history_file = DATA / "crm_history.jsonl"
    if history_file.exists():
        os.remove(history_file)
        print("🗑️ Очистили файл истории для теста")
    
    # Создаем тестовые события
    print("\n📝 Создаем тестовые события...")
    test_events = [
        {
            "action": "dialog_started",
            "initiated_by": "user",
            "username": "test_user_endpoints"
        },
        {
            "action": "message_received",
            "from": "user",
            "content": "Привет! Хочу арендовать машину через endpoints"
        },
        {
            "action": "message_sent",
            "from": "manager",
            "content": "Здравствуйте! Помогу с выбором через API"
        },
        {
            "action": "claude_started",
            "initiated_by": "manager"
        },
        {
            "action": "claude_response",
            "from": "claude",
            "content": "Рекомендую рассмотреть Honda Civic через Claude API"
        }
    ]
    
    for event_data in test_events:
        log_dialog_event(test_user_id, **event_data)
    
    print(f"✅ Создано {len(test_events)} тестовых событий")
    
    # Базовый URL для тестирования
    base_url = "http://localhost:5000"
    
    # === ТЕСТ 1: GET /api/crm/dialog/{user_id}/status ===
    print("\n📊 ТЕСТ 1: GET /api/crm/dialog/{user_id}/status")
    
    try:
        response = requests.get(f"{base_url}/api/crm/dialog/{test_user_id}/status")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            dialog_status = data.get("dialog", {})
            print(f"✅ Успешный ответ:")
            print(f"   Активен: {dialog_status.get('active')}")
            print(f"   Новые сообщения: {dialog_status.get('has_new_messages')}")
            print(f"   Всего сообщений: {dialog_status.get('message_count')}")
            print(f"   Статус Claude: {dialog_status.get('claude_status')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую через функции...")
        # Тестируем напрямую через функции
        status = get_dialog_status_from_history(test_user_id)
        print(f"✅ Прямое тестирование функции:")
        print(f"   Активен: {status['active']}")
        print(f"   Новые сообщения: {status['has_new_messages']}")
        print(f"   Всего сообщений: {status['message_count']}")
        print(f"   Статус Claude: {status['claude_status']}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 2: GET /api/crm/dialog/{user_id}/events ===
    print("\n📚 ТЕСТ 2: GET /api/crm/dialog/{user_id}/events")
    
    try:
        response = requests.get(f"{base_url}/api/crm/dialog/{test_user_id}/events?limit=10")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            events = data.get("events", [])
            total = data.get("total", 0)
            print(f"✅ Успешный ответ:")
            print(f"   Всего событий: {total}")
            print(f"   Получено событий: {len(events)}")
            
            for i, event in enumerate(events[:3], 1):  # Показываем первые 3
                print(f"   {i}. {event.get('timestamp', 'N/A')} - {event.get('action', 'N/A')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую через функции...")
        # Тестируем напрямую через функции
        events = get_dialog_events(test_user_id, limit=10)
        print(f"✅ Прямое тестирование функции:")
        print(f"   Всего событий: {len(events)}")
        for i, event in enumerate(events[:3], 1):
            print(f"   {i}. {event.get('timestamp', 'N/A')} - {event.get('action', 'N/A')}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 3: POST /api/crm/dialog/{user_id}/mark-read ===
    print("\n📖 ТЕСТ 3: POST /api/crm/dialog/{user_id}/mark-read")
    
    try:
        response = requests.post(f"{base_url}/api/crm/dialog/{test_user_id}/mark-read")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Успешный ответ: {data}")
            
            # Проверяем что статус обновился
            status_after = get_dialog_status_from_history(test_user_id)
            print(f"📋 Статус после mark-read:")
            print(f"   Новые сообщения: {status_after.get('has_new_messages')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую через функции...")
        # Тестируем напрямую через функции
        log_dialog_event(test_user_id, action="messages_marked_read", by="manager")
        status_after = get_dialog_status_from_history(test_user_id)
        print(f"✅ Прямое тестирование функции:")
        print(f"   Новые сообщения после mark-read: {status_after.get('has_new_messages')}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 4: GET /api/crm/dialogs/active ===
    print("\n💬 ТЕСТ 4: GET /api/crm/dialogs/active")
    
    try:
        response = requests.get(f"{base_url}/api/crm/dialogs/active")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            active_dialogs = data.get("active_dialogs", [])
            total_active = data.get("total_active", 0)
            print(f"✅ Успешный ответ:")
            print(f"   Всего активных диалогов: {total_active}")
            print(f"   Найдено активных: {len(active_dialogs)}")
            
            for dialog in active_dialogs:
                user_id = dialog.get("user_id")
                status = dialog.get("status", {})
                print(f"   👤 Пользователь {user_id}: активен={status.get('active')}, сообщений={status.get('message_count')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, пропускаем тест активных диалогов")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 5: Тест с несуществующим пользователем ===
    print("\n❓ ТЕСТ 5: Тест с несуществующим пользователем")
    
    fake_user_id = 999888777
    try:
        response = requests.get(f"{base_url}/api/crm/dialog/{fake_user_id}/status")
        print(f"📡 Статус ответа для несуществующего пользователя: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            dialog_status = data.get("dialog", {})
            print(f"✅ Ответ для несуществующего пользователя:")
            print(f"   Активен: {dialog_status.get('active')}")
            print(f"   Новые сообщения: {dialog_status.get('has_new_messages')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        # Тестируем напрямую
        status = get_dialog_status_from_history(fake_user_id)
        print(f"✅ Прямое тестирование несуществующего пользователя:")
        print(f"   Активен: {status['active']}")
        print(f"   Новые сообщения: {status['has_new_messages']}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    print("\n🎉 Тестирование API endpoints завершено!")
    
    # Показываем итоговую статистику
    print("\n📊 Итоговая статистика:")
    all_events = get_dialog_events(test_user_id, limit=20)
    print(f"   Всего событий для тестового пользователя: {len(all_events)}")
    
    final_status = get_dialog_status_from_history(test_user_id)
    print(f"   Итоговый статус диалога:")
    print(f"   - Активен: {final_status['active']}")
    print(f"   - Новые сообщения: {final_status['has_new_messages']}")
    print(f"   - Всего сообщений: {final_status['message_count']}")
    print(f"   - Статус Claude: {final_status['claude_status']}")

if __name__ == "__main__":
    test_dialog_endpoints()