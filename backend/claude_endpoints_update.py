# ==============================
# ОБНОВЛЕННЫЕ CLAUDE ENDPOINTS С ИНТЕГРАЦИЕЙ ДИАЛОГОВ
# ==============================

# Заменить существующие CRM Claude endpoints (строки 2493-2523) в web_integration.py на эти:

@app.post(API_PREFIX + "/crm/start-claude")
def start_claude(req: StartClaudeRequest):
    """Запустить Claude диалог для пользователя"""
    try:
        user_id = req.user_id
        print(f"🚀 Starting Claude for user {user_id}")
        
        # ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: START
        update_dialog_status(
            user_id=user_id,
            claude_enabled=True,
            claude_status="active",
            claude_started_at=datetime.now().isoformat()
        )
        log_dialog_event(user_id, "claude_started", {"action": "start"})
        
        return {"status": "ok", "message": f"Claude started for user {user_id}"}
    except Exception as e:
        print(f"❌ Error in start_claude: {e}")
        return {"status": "error", "message": str(e)}

@app.post(API_PREFIX + "/crm/pause-claude")
def pause_claude(req: StartClaudeRequest):
    """Приостановить Claude диалог"""
    try:
        user_id = req.user_id
        print(f"⏸️ Pausing Claude for user {user_id}")
        
        # ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: PAUSE
        update_dialog_status(
            user_id=user_id,
            claude_enabled=False,
            claude_status="paused",
            claude_paused_at=datetime.now().isoformat()
        )
        log_dialog_event(user_id, "claude_paused", {"action": "pause"})
        
        return {"status": "ok", "message": f"Claude paused for user {user_id}"}
    except Exception as e:
        print(f"❌ Error in pause_claude: {e}")
        return {"status": "error", "message": str(e)}

@app.post(API_PREFIX + "/crm/resume-claude")
def resume_claude(req: StartClaudeRequest):
    """Возобновить Claude диалог"""
    try:
        user_id = req.user_id
        print(f"▶️ Resuming Claude for user {user_id}")
        
        # ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: RESUME
        update_dialog_status(
            user_id=user_id,
            claude_enabled=True,
            claude_status="active"
        )
        log_dialog_event(user_id, "claude_resumed", {"action": "resume"})
        
        return {"status": "ok", "message": f"Claude resumed for user {user_id}"}
    except Exception as e:
        print(f"❌ Error in resume_claude: {e}")
        return {"status": "error", "message": str(e)}

@app.post(API_PREFIX + "/crm/stop-claude")
def stop_claude(req: StartClaudeRequest):
    """Остановить Claude диалог"""
    try:
        user_id = req.user_id
        print(f"⏹️ Stopping Claude for user {user_id}")
        
        # ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: STOP
        update_dialog_status(
            user_id=user_id,
            active=False,
            claude_enabled=False,
            claude_status="stopped"
        )
        log_dialog_event(user_id, "claude_stopped", {"action": "stop"})
        
        return {"status": "ok", "message": f"Claude stopped for user {user_id}"}
    except Exception as e:
        print(f"❌ Error in stop_claude: {e}")
        return {"status": "error", "message": str(e)}

# Также обновить send_message endpoint для поддержки диалогов:

@app.post(API_PREFIX + "/crm/send_message")
async def send_message_to_user(msg_request: SendMessageRequest):
    """Отправить сообщение пользователю через Telegram бота"""
    try:
        print(f"[send_message] user_id={msg_request.user_id}, text={msg_request.text[:50]}...")
        
        # 1. Логируем сообщение в CHAT_LOGS_JSONL с ролью "manager"
        try:
            chat_log_entry = {
                "timestamp": msg_request.timestamp or datetime.utcnow().isoformat(),
                "user_id": msg_request.user_id,
                "role": "manager",
                "text": msg_request.text,
                "source": "crm_panel"
            }
            
            with open(CHAT_LOGS_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps(chat_log_entry, ensure_ascii=False) + "\n")
            print(f"✅ Message logged to chat history for user {msg_request.user_id}")
        except Exception as log_error:
            print(f"⚠️ Failed to log message to chat history: {log_error}")
            # Продолжаем выполнение даже если логирование не удалось
        
        # 2. ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: сообщение от менеджера
        update_dialog_status(
            user_id=msg_request.user_id,
            active=True,
            last_message_at=datetime.now().isoformat(),
            last_message_from="manager",
            message_count_increment=1
        )
        log_dialog_event(msg_request.user_id, "manager_message_sent", {
            "message_length": len(msg_request.text),
            "timestamp": msg_request.timestamp
        })
        
        # 3. Отправляем сообщение через внутренний endpoint telegram бота
        try:
            # Определяем URL внутреннего endpoint'а бота
            bot_internal_url = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001")
            if bot_internal_url.endswith('/'):
                bot_internal_url = bot_internal_url[:-1]
            internal_endpoint = f"{bot_internal_url}/internal/send_message"
            
            print(f"📤 Sending message to bot internal endpoint: {internal_endpoint}")
            
            response = requests.post(
                internal_endpoint,
                json={
                    "user_id": msg_request.user_id,
                    "text": msg_request.text
                },
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Message sent to user {msg_request.user_id} via bot")
                return {
                    "status": "ok",
                    "message": "Message sent successfully",
                    "logged_to_history": True,
                    "sent_via_bot": True
                }
            else:
                print(f"⚠️ Bot returned status {response.status_code}: {response.text}")
                return {
                    "status": "partial_success",
                    "message": "Message logged but failed to send via bot",
                    "logged_to_history": True,
                    "sent_via_bot": False,
                    "bot_error": f"Status {response.status_code}: {response.text}"
                }
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ Error connecting to bot: {e}")
            return {
                "status": "partial_success",
                "message": "Message logged but bot unreachable",
                "logged_to_history": True,
                "sent_via_bot": False,
                "bot_error": str(e)
            }
            
    except Exception as e:
        print(f"❌ Error in send_message: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# И обновить receive_message_from_bot для поддержки диалогов:

@app.post("/api/internal/receive-message")
async def receive_message_from_bot(request: Request):
    """Receive message from Telegram bot and log it"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        text = data.get('text')
        username = data.get('username')
        timestamp = data.get('timestamp')
        
        if not user_id or not text:
            raise HTTPException(status_code=400, detail="user_id and text are required")
        
        print(f"📨 Received message from bot: user {user_id}, text: {text[:50]}...")
        
        # 1. Log message to chat history with role "user"
        try:
            chat_log_entry = {
                "timestamp": timestamp or datetime.utcnow().isoformat(),
                "user_id": user_id,
                "role": "user",
                "text": text,
                "username": username,
                "source": "telegram_bot"
            }
            
            with open(CHAT_LOGS_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps(chat_log_entry, ensure_ascii=False) + "\n")
            print(f"✅ Message logged to chat history for user {user_id}")
        except Exception as log_error:
            print(f"⚠️ Failed to log message to chat history: {log_error}")
        
        # 2. ✅ ОБНОВЛЯЕМ СТАТУС ДИАЛОГА: новое сообщение от пользователя
        update_dialog_status(
            user_id=user_id,
            active=True,
            has_new_messages=True,
            last_message_at=datetime.now().isoformat(),
            last_message_from="user",
            message_count_increment=1,
            username=username
        )
        log_dialog_event(user_id, "user_message_received", {
            "message_length": len(text),
            "username": username
        })
        
        # 3. Update user metadata (last message time) to move them up in CRM chat list
        try:
            users_data = load_json(USER_DATA_JSON)
            user_updated = False
            
            for user in users_data:
                if user.get('user_id') == user_id:
                    user['last_message_at'] = datetime.utcnow().isoformat()
                    user['updated_at'] = datetime.utcnow().isoformat()
                    user_updated = True
                    break
            
            if user_updated:
                save_json(USER_DATA_JSON, users_data)
                print(f"✅ Updated metadata for user {user_id}")
            else:
                print(f"⚠️ User {user_id} not found in user_data, creating new record")
                # Create new user record if not exists
                new_user = {
                    "user_id": user_id,
                    "username": username,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                    "status": "new",
                    "form_started": False,
                    "booking_submitted": False,
                    "car_interested": None,
                    "category_interested": None,
                    "dates_selected": None,
                    "notes": [],
                    "source": "telegram_bot",
                    "last_message_at": datetime.utcnow().isoformat()
                }
                users_data.append(new_user)
                save_json(USER_DATA_JSON, users_data)
                print(f"✅ Created new user record for {user_id}")
                
        except Exception as metadata_error:
            print(f"⚠️ Failed to update user metadata: {metadata_error}")
        
        return {
            "status": "ok",
            "message": "Message received and logged successfully"
        }
        
    except Exception as e:
        print(f"❌ Error in receive_message_from_bot: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))