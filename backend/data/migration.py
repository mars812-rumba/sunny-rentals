import json
import os
from datetime import datetime

USER_DATA_JSON = 'user_migration.json'

def migrate():
    if not os.path.exists(USER_DATA_JSON):
        print("❌ Файл не найден")
        return

    with open(USER_DATA_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    unique_users = {}

    for entry in data:
        uid = entry.get("user_id")
        if not uid: continue

        # --- ЛОГИКА ОПРЕДЕЛЕНИЯ СТАТУСА ПО ФАКТАМ ---
        
        # Данные для проверки
        car = entry.get("car_interested") or entry.get("vehicle_interested")
        dates = entry.get("dates_selected")
        is_submitted = entry.get("booking_submitted", False)
        
        # Определяем статус с нуля
        if is_submitted:
            status = "pending"   # Заявка (была кнопка "забронировать")
        elif car or dates:
            status = "interested" # Теплые (выбрал машину или даты)
        else:
            # Если поле status уже было изменено вручную в CRM, сохраняем его
            # Если там "new", но есть данные — логика выше его перебьет
            status = entry.get("status", "new")

        # Создаем чистый объект
        record = {
            "user_id": uid,
            "username": entry.get("username"),
            "created_at": entry.get("created_at") or entry.get("timestamp"),
            "updated_at": datetime.utcnow().isoformat(),
            "status": status, 
            "car_interested": car,
            "category_interested": entry.get("category_interested"),
            "dates_selected": dates,
            "form_started": entry.get("form_started", car is not None),
            "booking_submitted": is_submitted,
            "notes": entry.get("notes") if isinstance(entry.get("notes"), list) else [],
            "archived": entry.get("archived", False),
            "source": entry.get("source", "direct")
        }

        # Мерджим дубли (оставляем самый "сильный" статус)
        if uid not in unique_users:
            unique_users[uid] = record
        else:
            existing = unique_users[uid]
            # Если у нового дубля статус "сильнее" (pending > interested > new), обновляем
            weights = {"new": 1, "interested": 2, "pending": 3, "confirmed": 4, "completed": 5}
            if weights.get(status, 0) > weights.get(existing["status"], 0):
                existing["status"] = status
            
            # Дозаполняем данные, если их не было
            if not existing["car_interested"]: existing["car_interested"] = car
            if not existing["dates_selected"]: existing["dates_selected"] = dates

    # Сохраняем
    with open(USER_DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(list(unique_users.values()), f, indent=2, ensure_ascii=False)

    print(f"✅ Миграция завершена. Юзеров в базе: {len(unique_users)}")

if __name__ == "__main__":
    migrate()