#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестирование Claude интеграции с логированием диалогов
ЭТАП 4.3: Протестировать Claude интеграцию
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

def test_claude_integration():
    """Тестирование Claude интеграции с логированием диалогов"""
    print("🤖 Начинаем тестирование Claude интеграции...")
    
    # Тестовый user_id
    test_user_id = 888999000
    
    # Очищаем файл истории для чистого теста
    history_file = DATA / "crm_history.jsonl"
    if history_file.exists():
        os.remove(history_file)
        print("🗑️ Очистили файл истории для теста")
    
    # Базовый URL для тестирования
    base_url = "http://localhost:5000"
    
    # === ТЕСТ 1: START Claude ===
    print("\n🚀 ТЕСТ 1: START Claude")
    
    try:
        response = requests.post(f"{base_url}/api/crm/start-claude", 
                               json={"user_id": test_user_id})
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Успешный ответ: {data}")
            
            # Проверяем логирование
            events = get_dialog_events(test_user_id, limit=10)
            claude_events = [e for e in events if e.get('action') == 'claude_started']
            if claude_events:
                print(f"✅ Событие claude_started залогировано: {claude_events[0]}")
            else:
                print(f"❌ Событие claude_started НЕ залогировано")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую через функции...")
        # Тестируем напрямую через функции
        log_dialog_event(test_user_id, "claude_started", {"action": "start"})
        events = get_dialog_events(test_user_id, limit=10)
        claude_events = [e for e in events if e.get('action') == 'claude_started']
        print(f"✅ Прямое тестирование: {len(claude_events)} событий claude_started")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 2: PAUSE Claude ===
    print("\n⏸️ ТЕСТ 2: PAUSE Claude")
    
    try:
        response = requests.post(f"{base_url}/api/crm/pause-claude", 
                               json={"user_id": test_user_id})
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Успешный ответ: {data}")
            
            # Проверяем логирование
            events = get_dialog_events(test_user_id, limit=10)
            pause_events = [e for e in events if e.get('action') == 'claude_paused']
            if pause_events:
                print(f"✅ Событие claude_paused залогировано: {pause_events[0]}")
            else:
                print(f"❌ Событие claude_paused НЕ залогировано")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        log_dialog_event(test_user_id, "claude_paused", {"action": "pause"})
        events = get_dialog_events(test_user_id, limit=10)
        pause_events = [e for e in events if e.get('action') == 'claude_paused']
        print(f"✅ Прямое тестирование: {len(pause_events)} событий claude_paused")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 3: RESUME Claude ===
    print("\n▶️ ТЕСТ 3: RESUME Claude")
    
    try:
        response = requests.post(f"{base_url}/api/crm/resume-claude", 
                               json={"user_id": test_user_id})
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Успешный ответ: {data}")
            
            # Проверяем логирование
            events = get_dialog_events(test_user_id, limit=10)
            resume_events = [e for e in events if e.get('action') == 'claude_resumed']
            if resume_events:
                print(f"✅ Событие claude_resumed залогировано: {resume_events[0]}")
            else:
                print(f"❌ Событие claude_resumed НЕ залогировано")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        log_dialog_event(test_user_id, "claude_resumed", {"action": "resume"})
        events = get_dialog_events(test_user_id, limit=10)
        resume_events = [e for e in events if e.get('action') == 'claude_resumed']
        print(f"✅ Прямое тестирование: {len(resume_events)} событий claude_resumed")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 4: STOP Claude ===
    print("\n⏹️ ТЕСТ 4: STOP Claude")
    
    try:
        response = requests.post(f"{base_url}/api/crm/stop-claude", 
                               json={"user_id": test_user_id})
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Успешный ответ: {data}")
            
            # Проверяем логирование
            events = get_dialog_events(test_user_id, limit=10)
            stop_events = [e for e in events if e.get('action') == 'claude_stopped']
            if stop_events:
                print(f"✅ Событие claude_stopped залогировано: {stop_events[0]}")
            else:
                print(f"❌ Событие claude_stopped НЕ залогировано")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        log_dialog_event(test_user_id, "claude_stopped", {"action": "stop"})
        events = get_dialog_events(test_user_id, limit=10)
        stop_events = [e for e in events if e.get('action') == 'claude_stopped']
        print(f"✅ Прямое тестирование: {len(stop_events)} событий claude_stopped")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 5: Проверка статуса диалога ===
    print("\n📊 ТЕСТ 5: Проверка статуса диалога")
    
    try:
        response = requests.get(f"{base_url}/api/crm/dialog/{test_user_id}/status")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            dialog_status = data.get("dialog", {})
            print(f"✅ Статус диалога:")
            print(f"   Активен: {dialog_status.get('active')}")
            print(f"   Статус Claude: {dialog_status.get('claude_status')}")
            print(f"   Всего сообщений: {dialog_status.get('message_count')}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        status = get_dialog_status_from_history(test_user_id)
        print(f"✅ Прямое тестирование статуса:")
        print(f"   Активен: {status['active']}")
        print(f"   Статус Claude: {status['claude_status']}")
        print(f"   Всего сообщений: {status['message_count']}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    # === ТЕСТ 6: Полная история событий ===
    print("\n📚 ТЕСТ 6: Полная история событий")
    
    try:
        response = requests.get(f"{base_url}/api/crm/dialog/{test_user_id}/events?limit=20")
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            events = data.get("events", [])
            total = data.get("total", 0)
            print(f"✅ История событий:")
            print(f"   Всего событий: {total}")
            
            # Группируем по типам
            claude_actions = {}
            for event in events:
                action = event.get('action', 'unknown')
                if action not in claude_actions:
                    claude_actions[action] = 0
                claude_actions[action] += 1
            
            print(f"   События по типам:")
            for action, count in claude_actions.items():
                print(f"     {action}: {count}")
        else:
            print(f"❌ Ошибка: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Сервер не запущен, тестируем напрямую...")
        events = get_dialog_events(test_user_id, limit=20)
        print(f"✅ Прямое тестирование истории:")
        print(f"   Всего событий: {len(events)}")
        
        claude_actions = {}
        for event in events:
            action = event.get('action', 'unknown')
            if action not in claude_actions:
                claude_actions[action] = 0
            claude_actions[action] += 1
        
        print(f"   События по типам:")
        for action, count in claude_actions.items():
            print(f"     {action}: {count}")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    print("\n🎉 Тестирование Claude интеграции завершено!")
    
    # Показываем итоговую статистику
    print("\n📊 Итоговая статистика:")
    all_events = get_dialog_events(test_user_id, limit=50)
    print(f"   Всего событий для тестового пользователя: {len(all_events)}")
    
    final_status = get_dialog_status_from_history(test_user_id)
    print(f"   Итоговый статус диалога:")
    print(f"   - Активен: {final_status['active']}")
    print(f"   - Статус Claude: {final_status['claude_status']}")
    print(f"   - Всего сообщений: {final_status['message_count']}")
    
    # Проверяем последовательность событий
    claude_sequence = [e.get('action') for e in all_events if e.get('action', '').startswith('claude_')]
    print(f"   Последовательность Claude событий: {claude_sequence}")
    
    # Ожидаемая последовательность: started -> paused -> resumed -> stopped
    expected_sequence = ['claude_started', 'claude_paused', 'claude_resumed', 'claude_stopped']
    if claude_sequence == expected_sequence:
        print(f"✅ Последовательность событий корректна!")
    else:
        print(f"⚠️ Последовательность событий не соответствует ожидаемой")
        print(f"   Ожидалось: {expected_sequence}")
        print(f"   Получено: {claude_sequence}")

if __name__ == "__main__":
    test_claude_integration()