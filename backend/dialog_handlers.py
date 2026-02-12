# ФУНКЦИИ ОБРАБОТКИ СОБЫТИЙ ДИАЛОГОВ
# Добавить в telegram_bot.py после функции send_dialog_to_group

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