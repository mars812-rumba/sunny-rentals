import json
import os
from datetime import datetime

USER_DATA_JSON = 'user_data.json' # Путь к твоему файлу

def migrate():
    if not os.path.exists(USER_DATA_JSON):
        print("Файл не найден")
        return

    with open(USER_DATA_JSON, 'r', encoding='utf-8') as f:
        old_data = json.load(f)

    new_data = []

    for user in old_data:
        # 1. Унифицируем статус
        # Логика: booked -> pending, awaiting_followup -> interested, остальное -> new
        old_fs = user.get("final_status", "")
        old_s = user.get("status", "")
        action = user.get("action", "")

        if old_fs == "booked" or action == "booking_submitted":
            status = "pending"
        elif old_fs == "awaiting_followup" or action == "filters_used":
            status = "interested"
        elif old_s in ["hot", "booked"]:
            status = "pending"
        elif old_s == "in_progress":
            status = "interested"
        else:
            status = "new"

        # 2. Унифицируем время (timestamp -> created_at)
        created_at = user.get("timestamp") or user.get("created_at") or datetime.utcnow().isoformat()

        # 3. Чистим машину (объединяем car_interested и vehicle_interested)
        car = user.get("car_interested") or user.get("vehicle_interested")

        # 4. Собираем объект по новому стандарту
        new_record = {
            "user_id": user.get("user_id"),
            "username": user.get("username"),
            "created_at": created_at,
            "updated_at": datetime.utcnow().isoformat(),
            "status": status,
            "category_interested": user.get("category_interested"),
            "car_interested": car,
            "dates_selected": user.get("dates_selected"),
            "form_started": user.get("form_started", False),
            "booking_submitted": user.get("booking_submitted", False),
            "notes": user.get("notes") if isinstance(user.get("notes"), list) else [],
            "archived": user.get("archived", False),
            "archived_at": user.get("archived_at"),
            "source": user.get("source", "direct")
        }
        
        new_data.append(new_record)

    # Сохраняем бэкап перед записью
    with open(USER_DATA_JSON + '.bak', 'w', encoding='utf-8') as f:
        json.dump(old_data, f, indent=2, ensure_ascii=False)

    # Записываем новые данные
    with open(USER_DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Миграция завершена! Обработано {len(new_data)} записей.")
    print(f"📁 Бэкап старых данных сохранен в {USER_DATA_JSON}.bak")

if __name__ == "__main__":
    migrate()