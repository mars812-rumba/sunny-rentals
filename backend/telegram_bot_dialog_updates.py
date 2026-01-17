# ОБНОВЛЕНИЯ ДЛЯ TELEGRAM_BOT.PY - ЭТАП 6
# Добавление обработчиков событий диалогов

# 1. ДОБАВИТЬ ИМПОРТЫ (после строки 30)
# ========================================
"""
# Import our new modules
from user_tracker import UserTracker
from admin_commands import AdminCommands
import random

# Импорт функций для работы с диалогами
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from web_integration import update_dialog_status, log_dialog_event, get_dialog_status
"""

# 2. ДОБАВИТЬ ФУНКЦИИ ОБРАБОТКИ СОБЫТИЙ ДИАЛОГОВ (после строки 360)
# =================================================================
"""
def handle_dialog_user_message(user_id: int, message_text: str):
    """Обработка сообщения от пользователя - обновляет статус диалога"""
    try:
        print(f"💬 Обработка сообщения от пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            has_new_messages=True,
            last_message_at=datetime.now().isoformat(),
            last_message_from="user",
            message_count_increment=1
        )
        
        # Логируем событие
        log_dialog_event(user_id, "user_message", {
            "message_length": len(message_text),
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Обновлен статус диалога для пользователя {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка обработки сообщения пользователя {user_id}: {e}")

def handle_dialog_manager_message(user_id: int, message_text: str):
    """Обработка сообщения от менеджера - обновляет статус диалога"""
    try:
        print(f"👨‍💼 Обработка сообщения менеджера для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            last_message_at=datetime.now().isoformat(),
            last_message_from="manager",
            message_count_increment=1
        )
        
        # Логируем событие
        log_dialog_event(user_id, "manager_message", {
            "message_length": len(message_text),
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Обновлен статус диалога для менеджера {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка обработки сообщения менеджера {user_id}: {e}")

def handle_dialog_claude_message(user_id: int, response_text: str):
    """Обработка ответа от Claude - обновляет статус диалога"""
    try:
        print(f"🤖 Обработка ответа Claude для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            last_message_at=datetime.now().isoformat(),
            last_message_from="claude",
            message_count_increment=1
        )
        
        # Логируем событие
        log_dialog_event(user_id, "claude_message", {
            "response_length": len(response_text),
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Обновлен статус диалога для Claude {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка обработки ответа Claude {user_id}: {e}")

def handle_claude_start(user_id: int):
    """Обработка запуска Claude - обновляет статус диалога"""
    try:
        print(f"🧠 Запуск Claude для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            claude_enabled=True,
            claude_status="active",
            claude_started_at=datetime.now().isoformat()
        )
        
        # Логируем событие
        log_dialog_event(user_id, "claude_start", {
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Запущен Claude для пользователя {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка запуска Claude {user_id}: {e}")

def handle_claude_pause(user_id: int):
    """Обработка паузы Claude - обновляет статус диалога"""
    try:
        print(f"⏸️ Пауза Claude для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            claude_enabled=False,
            claude_status="paused",
            claude_paused_at=datetime.now().isoformat()
        )
        
        # Логируем событие
        log_dialog_event(user_id, "claude_pause", {
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Claude приостановлен для пользователя {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка паузы Claude {user_id}: {e}")

def handle_claude_resume(user_id: int):
    """Обработка возобновления Claude - обновляет статус диалога"""
    try:
        print(f"▶️ Возобновление Claude для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            claude_enabled=True,
            claude_status="active"
        )
        
        # Логируем событие
        log_dialog_event(user_id, "claude_resume", {
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Claude возобновлен для пользователя {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка возобновления Claude {user_id}: {e}")

def handle_claude_stop(user_id: int):
    """Обработка остановки Claude - обновляет статус диалога"""
    try:
        print(f"⏹️ Остановка Claude для пользователя {user_id}")
        
        # Обновляем статус диалога
        update_dialog_status(
            user_id=user_id,
            active=False,
            claude_enabled=False,
            claude_status="stopped"
        )
        
        # Логируем событие
        log_dialog_event(user_id, "claude_stop", {
            "timestamp": datetime.now().isoformat()
        })
        
        print(f"✅ Claude остановлен для пользователя {user_id}")
        
    except Exception as e:
        print(f"❌ Ошибка остановки Claude {user_id}: {e}")
"""

# 3. ОБНОВИТЬ СУЩЕСТВУЮЩИЕ ОБРАБОТЧИКИ
# =====================================

# В функции handle_start_claude (строка ~498) добавить после initiate_claude_dialogue:
"""
# ✅ ЗАПУСКАЕМ ДИАЛОГ CLAUDE
print(f"🚀 Calling initiate_claude_dialogue({user_id}, {filters})")
initiate_claude_dialogue(user_id, filters)

# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА
handle_claude_start(user_id)
"""

# В функции handle_start_claude_command (строка ~810) добавить после initiate_claude_dialogue:
"""
# Запускаем диалог Claude немедленно
print(f"🚀 Calling initiate_claude_dialogue({user_id}, {filters})")
initiate_claude_dialogue(user_id, filters)

# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА
handle_claude_start(user_id)
"""

# В функции handle_claude_conversation (строка ~992) добавить в начало:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ СООБЩЕНИИ ОТ ПОЛЬЗОВАТЕЛЯ
handle_dialog_user_message(user_id, user_input)
"""

# В функции process_claude_message (строка ~451) добавить после получения ответа:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ ОТВЕТЕ CLAUDE
if result and result.get("status") == "success":
    response_text = result.get("response_text", "")
    handle_dialog_claude_message(user_id, response_text)
"""

# В функции crm_send_message (строка ~1676) добавить после отправки сообщения:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ СООБЩЕНИИ ОТ МЕНЕДЖЕРА
handle_dialog_manager_message(user_id, text)
"""

# В функции api_pause_claude (строка ~1647) добавить:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ ПАУЗЕ CLAUDE
handle_claude_pause(user_id)
"""

# В функции api_resume_claude (строка ~1657) добавить:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ ВОЗОБНОВЛЕНИИ CLAUDE
handle_claude_resume(user_id)
"""

# В функции api_stop_claude (строка ~1667) добавить:
"""
# ОБНОВЛЯЕМ СТАТУС ДИАЛОГА ПРИ ОСТАНОВКЕ CLAUDE
handle_claude_stop(user_id)
"""

# 4. ДОБАВИТЬ НОВЫЕ ENDPOINTS (после строки ~1728)
# ================================================
"""
@app.post("/api/crm/dialog/{user_id}/mark-read")
async def mark_dialog_read(user_id: int):
    """Сбросить флаг has_new_messages когда менеджер открыл чат"""
    try:
        update_dialog_status(
            user_id=user_id,
            has_new_messages=False
        )
        
        log_dialog_event(user_id, "mark_read", {
            "timestamp": datetime.now().isoformat()
        })
        
        return JSONResponse(content={"status": "ok"})
    except Exception as e:
        print(f"❌ Error marking dialog read for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/dialog/{user_id}/status")
async def get_dialog_status_endpoint(user_id: int):
    """Получить статус диалога для пользователя"""
    try:
        status = get_dialog_status(user_id)
        return JSONResponse(content={"status": "ok", "dialog": status})
    except Exception as e:
        print(f"❌ Error getting dialog status for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
"""