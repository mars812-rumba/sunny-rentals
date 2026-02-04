import json
from pathlib import Path
from datetime import datetime

# Настройки путей
DATA_DIR = Path("data")
CHAT_LOGS = DATA_DIR / "chat_history.jsonl"
ACTION_LOGS = DATA_DIR / "user_actions.log"
OUTPUT_FILE = DATA_DIR / "user_data.json"

def recover():
    users = {}

    def get_user_template(user_id, username=None):
        return {
            "user_id": user_id,
            "username": username,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "status": "new",
            "final_status": "new",
            "form_started": False,
            "booking_submitted": False,
            "car_interested": None,
            "category_interested": None,
            "dates_selected": None,
            "notes": [],
            "source": "restored",
            "marker": None,
            "last_note": None
        }

    # 1. Читаем историю чатов (вытаскиваем ID и последние сообщения)
    if CHAT_LOGS.exists():
        print(f"📖 Читаем чаты из {CHAT_LOGS}...")
        with open(CHAT_LOGS, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    uid = str(entry.get("user_id"))
                    if uid not in users:
                        users[uid] = get_user_template(uid, entry.get("username"))
                    
                    # Обновляем время последней активности
                    ts = entry.get("timestamp")
                    if ts and ts > users[uid]["updated_at"]:
                        users[uid]["updated_at"] = ts
                except: continue

    # 2. Читаем логи действий (восстанавливаем статусы и маркеры)
    if ACTION_LOGS.exists():
        print(f"📖 Читаем действия из {ACTION_LOGS}...")
        with open(ACTION_LOGS, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    action = json.loads(line.strip())
                    uid = str(action.get("user_id"))
                    
                    if uid not in users:
                        users[uid] = get_user_template(uid)

                    a_type = action.get("action_type")
                    meta = action.get("metadata", {})

                    if a_type == "status_changed":
                        users[uid]["status"] = meta.get("new_status")
                        users[uid]["final_status"] = meta.get("new_status")
                    elif a_type == "marker_updated":
                        users[uid]["marker"] = meta.get("marker")
                    elif a_type == "note_added":
                        users[uid]["last_note"] = meta.get("note")
                    
                    # Если в логе есть данные о бронировании, подтягиваем их
                    if "car_interested" in meta:
                        users[uid]["car_interested"] = meta.get("car_interested")
                    
                    # Обновляем время
                    ts = action.get("timestamp")
                    if ts and ts > users[uid]["updated_at"]:
                        users[uid]["updated_at"] = ts
                except: continue

    # Конвертируем словарь в список
    restored_list = list(users.values())
    
    # Сохраняем результат
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(restored_list, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Восстановление завершено! Найдено лидов: {len(restored_list)}")
    print(f"📁 Файл сохранен: {OUTPUT_FILE}")

if __name__ == "__main__":
    recover()