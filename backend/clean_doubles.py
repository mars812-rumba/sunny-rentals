
"""
Скрипт очистки user_data.json от дубликатов
Оставляет только ПОСЛЕДНЮЮ запись для каждого юзера
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Путь к файлу
USER_DATA_FILE = "/root/tgbot/webapp/backend/data/archive.json"
BACKUP_FILE = "/root/tgbot/webapp/backend/data/archive_backup.json"

def load_json(filepath):
    """Загрузить JSON"""
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath, data):
    """Сохранить JSON"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def cleanup_user_data():
    """Очистить дубликаты - оставить только последнюю запись"""
    
    print("🧹 Начинаем очистку user_data.json...")
    
    # Загружаем данные
    users_data = load_json(USER_DATA_FILE)
    original_count = len(users_data)
    print(f"📊 Всего записей: {original_count}")
    
    # Создаём бэкап
    save_json(BACKUP_FILE, users_data)
    print(f"💾 Бэкап сохранён: {BACKUP_FILE}")
    
    # Группируем по user_id
    users_dict = {}
    
    for record in users_data:
        user_id = record.get("user_id")
        if user_id is None:
            print(f"⚠️ Пропускаем запись без user_id: {record}")
            continue
        
        timestamp = record.get("timestamp", "")
        
        # Если юзер уже есть - сравниваем даты
        if user_id in users_dict:
            existing_timestamp = users_dict[user_id].get("timestamp", "")
            
            # Берём самую свежую запись
            if timestamp > existing_timestamp:
                users_dict[user_id] = record
        else:
            users_dict[user_id] = record
    
    # Преобразуем обратно в список
    cleaned_data = list(users_dict.values())
    
    # Сортируем по timestamp (свежие вперёд)
    cleaned_data.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Сохраняем
    save_json(USER_DATA_FILE, cleaned_data)
    
    # Статистика
    final_count = len(cleaned_data)
    removed_count = original_count - final_count
    
    print("\n" + "="*50)
    print("✅ ОЧИСТКА ЗАВЕРШЕНА!")
    print("="*50)
    print(f"📊 Было записей:     {original_count}")
    print(f"✅ Осталось записей: {final_count}")
    print(f"🗑️  Удалено дублей:   {removed_count}")
    print(f"💾 Файл сохранён:    {USER_DATA_FILE}")
    print(f"🔙 Бэкап:            {BACKUP_FILE}")
    print("="*50)
    
    # Показываем топ-10 юзеров
    print("\n📋 Топ-10 пользователей:")
    print("-" * 50)
    for i, user in enumerate(cleaned_data[:10], 1):
        user_id = user.get("user_id")
        username = user.get("username", "Unknown")
        status = user.get("status", "unknown")
        timestamp = user.get("timestamp", "")
        
        # Форматируем дату
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            date_str = dt.strftime("%d.%m.%Y %H:%M")
        except:
            date_str = timestamp[:16] if timestamp else "N/A"
        
        print(f"{i:2d}. ID: {user_id:10d} | @{username:15s} | {status:12s} | {date_str}")
    
    print("\n✅ Готово! Можно перезапустить бэкенд.")

if __name__ == "__main__":
    try:
        cleanup_user_data()
    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()