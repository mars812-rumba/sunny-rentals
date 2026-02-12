#!/usr/bin/env python3
"""
Unified Voice System: Transcription + Telegram Delivery
Transcribes using OpenAI Whisper API and sends immediately to Telegram
"""

import os
import sys
import json
import time
import signal
from pathlib import Path
import subprocess

# Конфигурация
INBOUND_DIR = Path("/home/openclawbot/.clawdbot/media/inbound")
TRANSCRIBED_DIR = Path("/home/openclawbot/.clawdbot/media/transcribed")
LOG_FILE = Path("/tmp/voice_unified.log")
TRANSCRIBE_SCRIPT = "/home/openclawbot/clawd/transcribe.sh"
TELEGRAM_CHAT_ID = "374897465"
CLAWDBOT_BIN = "/usr/bin/clawdbot"

# Graceful shutdown
running = True
def signal_handler(sig, frame):
    global running
    log("🛑 Получен сигнал завершения...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def log(msg):
    t = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{t}] {msg}"
    print(line)
    try:
        with LOG_FILE.open("a") as f:
            f.write(line + "\n")
    except Exception:
        pass

def transcribe(audio_path: Path) -> str | None:
    """Transcribe using OpenAI API"""
    try:
        result = subprocess.run(
            [TRANSCRIBE_SCRIPT, str(audio_path)],
            capture_output=True,
            text=True,
            timeout=60
        )
        txt_path = result.stdout.strip()
        if Path(txt_path).exists():
            return Path(txt_path).read_text().strip()
    except Exception as e:
        log(f"❌ API error: {e}")
    return None

def send_to_telegram(text: str) -> bool:
    """Send text to Telegram via clawdbot CLI"""
    try:
        cmd = [
            CLAWDBOT_BIN, "message", "send",
            "--channel", "telegram",
            "--target", TELEGRAM_CHAT_ID,
            "--message", f"🎤 Voice: {text}"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            log("✅ Отправлено в Telegram")
            return True
        else:
            log(f"❌ Ошибка отправки: {result.stderr}")
    except Exception as e:
        log(f"❌ Exception при отправке: {e}")
    return False

def main():
    log("🚀 Voice Unified System STARTED")
    log(f"📂 Watching: {INBOUND_DIR}")
    log(f"🎯 Target: Telegram {TELEGRAM_CHAT_ID}")
    
    # Создаём директории если нет
    TRANSCRIBED_DIR.mkdir(exist_ok=True)
    
    processed_files = set()
    
    while running:
        try:
            # Ищем новые .ogg файлы
            for ogg in INBOUND_DIR.glob("*.ogg"):
                if ogg.name in processed_files:
                    continue
                    
                log(f"🎤 Found: {ogg.name}")
                processed_files.add(ogg.name)
                
                # Транскрибируем
                text = transcribe(ogg)
                if text:
                    log(f"📝 Text: {text[:80]}...")
                    
                    # Отправляем в Telegram
                    if send_to_telegram(text):
                        # Перемещаем в transcribed
                        ogg.rename(TRANSCRIBED_DIR / ogg.name)
                        log(f"✅ Готово: {ogg.name}")
                    else:
                        log(f"⚠️ Не отправлено, пробую снова через 5 сек...")
                        time.sleep(5)
                        if send_to_telegram(text):
                            ogg.rename(TRANSCRIBED_DIR / ogg.name)
                        else:
                            log(f"❌ Не удалось отправить: {ogg.name}")
                else:
                    log(f"❌ Ошибка транскрипции: {ogg.name}")
                    time.sleep(5)
                    
        except Exception as e:
            log(f"❌ Error in loop: {e}")
            time.sleep(5)
            
        time.sleep(1)
    
    log("👋 Voice Unified System STOPPED")

if __name__ == "__main__":
    main()