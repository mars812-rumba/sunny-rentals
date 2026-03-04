#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import threading
import shutil
import requests
import subprocess
import copy
import uuid
import re
import time
import yaml

from dotenv import load_dotenv


load_dotenv()

from datetime import date, datetime, timedelta, UTC
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Depends, status, Header, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse

from pydantic import BaseModel, Field, validator
from urllib.parse import unquote

# Claude AI imports
try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    print("⚠️ Anthropic SDK not available")


model_specs = {
    "yaris": {"fuel": "Бензин", "engine": "1.2L", "power": "91 л.с.", "transmission": "Автомат"},
    "ativ": {"fuel": "Бензин", "engine": "1.2L", "power": "86 л.с.", "transmission": "Автомат"},
    "city": {"fuel": "Бензин", "engine": "1.0L Turbo", "power": "122 л.с.", "transmission": "CVT"},
    "mazda2": {"fuel": "Бензин", "engine": "1.3L", "power": "91 л.с.", "transmission": "Автомат"},
    "mg5": {"fuel": "Бензин", "engine": "1.5L", "power": "114 л.с.", "transmission": "CVT"},
    "civic": {"fuel": "Бензин", "engine": "1.5L Turbo", "power": "182 л.с.", "transmission": "CVT"},
    "altis": {"fuel": "Бензин/Гибрид", "engine": "1.8L", "power": "140 л.с.", "transmission": "CVT"},
    "camry": {"fuel": "Бензин/Гибрид", "engine": "2.5L", "power": "178 л.с.", "transmission": "Автомат"},
    "hrv": {"fuel": "Бензин/Гибрид", "engine": "1.5L", "power": "121 л.с.", "transmission": "CVT"},
    "cx3": {"fuel": "Бензин", "engine": "2.0L", "power": "150 л.с.", "transmission": "Автомат"},
    "cx30": {"fuel": "Бензин", "engine": "2.0L", "power": "153 л.с.", "transmission": "Автомат"},
    "corolla": {"fuel": "Бензин/Гибрид", "engine": "1.8L", "power": "140 л.с.", "transmission": "CVT"},
    "fortuner": {"fuel": "Дизель", "engine": "2.4L", "power": "150 л.с.", "transmission": "Автомат"},
    "xforce": {"fuel": "Бензин", "engine": "1.5L Turbo", "power": "145 л.с.", "transmission": "CVT"},
    "v60": {"fuel": "Бензин", "engine": "2.0L Turbo", "power": "250 л.с.", "transmission": "Автомат"},
    "mux": {"fuel": "Дизель", "engine": "3.0L", "power": "177 л.с.", "transmission": "Автомат"},
    "raptor":{"fuel": "Дизель", "engine": "3.0L", "power": "177 л.с.", "transmission": "Автомат"},
    "vios": {"fuel": "Бензин", "engine": "1.5L", "power": "112 л.с.", "transmission": "Автомат"},
    "xpander": {"fuel": "Бензин", "engine": "1.5L", "power": "105 л.с.", "transmission": "Автомат"},
    "veloz": {"fuel": "Бензин", "engine": "1.5L", "power": "105 л.с.", "transmission": "CVT"}
}

# ==============================
# КОНФИГУРАЦИЯ
# ==============================

ROOT = Path(__file__).parent.parent
DATA = Path(__file__).parent / "data"
DATA.mkdir(exist_ok=True)
IMAGES = ROOT / "public" / "images_web"
IMAGES.mkdir(exist_ok=True)
MEDIA_ROOT = Path(__file__).parent / "media"
MEDIA_ROOT.mkdir(exist_ok=True)

VALID_CLASSES = ["compact", "sedan", "suv", "7s", "bikes"]

CARS_JSON = DATA / "web_cars.json"
BOOKINGS_FILE = DATA / "bookings.json"
USER_DATA_JSON = DATA / "user_data.json"
CHAT_LOGS_JSONL = DATA / "chat_logs.jsonl"
ARCHIVE_JSON = DATA / "archive.json"
CAR_OWNERS_JSON = DATA / "car_owners.json"

if not ARCHIVE_JSON.exists():
    with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
        json.dump([], f)

if not CAR_OWNERS_JSON.exists():
    with open(CAR_OWNERS_JSON, "w", encoding="utf-8") as f:
        json.dump({"owners": {}}, f)

ADMIN_KEY = "sunny2025"
ADMIN_ID = "6451825371"
API_PREFIX = "/api"

ADMIN_USERNAME = "sunny_admin"
ADMIN_PASSWORD = "Marseloid812$$"
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "secret-auth-token-for-sunny-rentals")
TG_WEBHOOK_URL = os.getenv("TG_WEBHOOK_URL","http://localhost:5001")
# Load cars JSON
try:
    with open(CARS_JSON, "r", encoding="utf-8") as f:
        CAR_LIST_JSON = json.load(f)
    print(f"✅ Loaded CAR_LIST_JSON with {len(CAR_LIST_JSON.get('cars', {}))} cars")
except FileNotFoundError:
    print(f"⚠️ CAR_LIST_JSON not found at {CARS_JSON}")
    CAR_LIST_JSON = {"cars": {}}
except Exception as e:
    print(f"⚠️ Error loading CAR_LIST_JSON: {e}")
    CAR_LIST_JSON = {"cars": {}}

# Claude AI Configuration
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

# Claude client initialization
claude_client = None
if CLAUDE_AVAILABLE and ANTHROPIC_API_KEY:
    try:
        claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        print("✅ Claude client initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize Claude client: {e}")
        
        



# Global variables for Claude conversations
user_conversations = {}  # {user_id: {"status": str, "history": list, "filters": dict}}
user_sessions = {}       # {user_id: {"claude_initiated": bool, ...}}

app = FastAPI(
    title="Sunny Rentals API",
    description="Backend для аренды авто на Пхукете",
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://localhost:8081", "http://127.0.0.1:8081", "https://sunny-rentals.online", "https://*.web.telegram.org"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images_web", StaticFiles(directory=IMAGES), name="images")
_lock = threading.Lock()


def load_prompts():
    try:
        with open('prompts.yaml', 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            
            if not data or "main_prompt" not in data or not data["main_prompt"]:
                print(f"⚠️ WARN: Файл prompts.yaml есть, но 'main_prompt' пуст.")
                return {
                    "main_prompt": "Default system prompt", 
                    "engineer_prompt": data.get("engineer_prompt", "") if data else ""
                }
            return data # Возвращаем данные, если всё ок
    except Exception as e:
        print(f"❌ Ошибка при загрузке промптов: {e}")
        return {"main_prompt": "Default prompt due to error", "engineer_prompt": ""}
        
prompts_data = load_prompts()
CLAUDE_SYSTEM_PROMPT = prompts_data.get("main_prompt")

print(f"✅ Промпт загружен. Длина: {len(CLAUDE_SYSTEM_PROMPT)} символов.")



# ==============================
# МОДЕЛИ Pydantic
# ==============================
class StatusUpdate(BaseModel):
    user_id: Union[int, str]
    status: str
    note: str = ""

class NoteAdd(BaseModel):
    user_id: Union[int, str]
    note: str

class LoginRequest(BaseModel):
    username: str
    password: str

class InitiateDialogRequest(BaseModel):
    user_id: Union[int, str]
    reason: str = "crm"

class StartClaudeRequest(BaseModel):
    user_id: Union[int, str]

class PhotoUpload(BaseModel):
    car_id: str

class PriceRange(BaseModel):
    price_1_6: int = Field(..., ge=0)
    price_7_14: int = Field(..., ge=0)
    price_15_29: int = Field(..., ge=0)
    price_30: int = Field(..., ge=0)

class Pricing(BaseModel):
    low_season: PriceRange
    high_season: PriceRange
    deposit: int = Field(..., ge=0)

class Car(BaseModel):
    id: str
    name: str
    class_: str = Field(..., alias="class")
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None
    available: bool = True
    photos: Dict[str, Any] = {}
    pricing: Dict[str, Any] = {}
    specs: Dict[str, Any] = {}
    supplier: str = "namo"
    quick_id: Optional[str] = None
    rating: float = 4.5

class BookingCreate(BaseModel):
    car_id: str
    start_date: date
    end_date: date
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    note: Optional[str] = None

    @validator("end_date")
    def end_after_start(cls, v, values):
        if "start_date" in values and v < values["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v

class Booking(BookingCreate):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SubmitFormRequest(BaseModel):
    user_id: str
    form_data: Dict[str, Any]

class BulkPriceUpdate(BaseModel):
    category: str
    adjustment_type: str
    adjustment_value: float
    season: str

class CarOwnerInfo(BaseModel):
    owner_id: Optional[str] = None
    facebook_url: Optional[str] = None
    available_until: Optional[str] = None
    status: Optional[str] = "available"
    notes: Optional[List[str]] = None
    
class CreateCarOwner(BaseModel):
    id: str
    name: str
    contact: str
    facebook_url: Optional[str] = None

# --- Pydantic модель для owner map (короткая) ---
class CarOwnerShort(BaseModel):
    id: str
    car_ids: list[str]
    
# 1. Создаем детальные модели для вложенных данных
class CarData(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None

class DatesData(BaseModel):
    start: str  # ISO datetime string
    end: str
    days: int

class LocationsData(BaseModel):
    pickupLocation: str
    returnLocation: str
    pickupAddress: Optional[str] = None
    returnAddress: Optional[str] = None
    
    class Config:
        populate_by_name = True

class PricingData(BaseModel):
    dailyRate: int
    totalRental: int
    deposit: int
    deliveryPickup: int
    deliveryReturn: int
    totalDelivery: int
    grandTotal: int

class ContactData(BaseModel):
    value: str
    type: str
    name: Optional[str] = None
    phone: Optional[str] = None

class FormData(BaseModel):
    car: CarData
    dates: DatesData
    locations: LocationsData
    pricing: PricingData
    contact: ContactData
    timestamp: Optional[str] = None

class AdminBookingRequest(BaseModel):
    form_data: FormData
    booking_id: Optional[str] = None
    user_id: Optional[Union[int, str]] = None
    
class LeadTrackRequest(BaseModel):
    user_id: Union[int, str] = Field(..., description="Telegram user ID (int) or web session ID (str)")
    username: Optional[str] = None
    event_type: str  # "webapp_opened", "filters_used", "booking_submitted"
    data: Optional[dict] = None

    @validator('user_id')
    def validate_user_id(cls, v):
        # If it's already an int or str, return as-is
        if isinstance(v, (int, str)):
            return v
        # Try to convert to int if possible
        try:
            return int(v)
        except (ValueError, TypeError):
            # If can't convert to int, return as string
            return str(v)

class StatusUpdateRequest(BaseModel):
    user_id: Union[int, str]
    status: str
    note: Optional[str] = None

class MarkerUpdate(BaseModel):
    user_id: Union[int, str]
    marker: Optional[str] = None  # null для сброса маркера

# ✅ ДОБАВЬ если нужна модель для User (опционально)
class UserData(BaseModel):
    user_id: Union[int, str]
    username: Optional[str] = None
    created_at: str  # Было timestamp
    status: str
    car_interested: Optional[str] = None
    category_interested: Optional[str] = None
    dates_selected: Optional[Dict[str, Any]] = None
    form_started: bool
    booking_submitted: bool
    
# Модель для возврата дат логистики
class LogisticsDate(BaseModel):
    booking_id: str = ""
    car_id: str = ""
    car_name: str = "Авто"
    pickup_date: str = ""
    return_date: str = ""
    client_name: str = "Клиент"
    location: str = ""

class LogActionRequest(BaseModel):
    user_id: Union[int, str]
    action_type: str  # "status_changed", "note_added", "booking_created", "user_archived", "custom"
    description: str
    metadata: Optional[Dict[str, Any]] = None
    performed_by: Optional[str] = None  # admin_id или "system"
    
class SendMessageRequest(BaseModel):
    user_id: Union[int, str]
    text: str
    role: str = "manager"
    timestamp: str
    
class MediaUploadRequest(BaseModel):
    user_id: Union[int, str]
    message: Optional[str] = None

# ==============================
# УТИЛИТЫ
# ==============================


def check_booking_overlap(
    car_id: str,
    start_date: str,
    end_date: str,
    exclude_booking_id: Optional[str] = None
    ) -> Dict:
    """Проверяет есть ли пересечение дат для машины."""
    bookings = load_bookings()
    
    new_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    new_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    conflicting = []
    
    for booking in bookings:
        if exclude_booking_id and booking.get('booking_id') == exclude_booking_id:
            continue
        
        # 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Игнорируем pre_booking
        if booking.get('status') == 'pre_booking':
            continue
            
        form_data = booking.get('form_data', {})
        if isinstance(form_data, dict):
            booking_car_id = form_data.get('car', {}).get('id')
        else:
            continue
            
        if booking_car_id != car_id:
            continue
        
        dates = form_data.get('dates', {})
        existing_start_str = dates.get('start')
        existing_end_str = dates.get('end')
        
        if not existing_start_str or not existing_end_str:
            continue
        
        existing_start = datetime.fromisoformat(existing_start_str.replace('Z', '+00:00'))
        existing_end = datetime.fromisoformat(existing_end_str.replace('Z', '+00:00'))
        
        if not (new_end <= existing_start or new_start >= existing_end):
            # ✅ Добавляем имя клиента и форматируем даты
            contact = form_data.get('contact', {})
            customer_name = contact.get('name', 'Неизвестный')
            
            conflicting.append({
                "customer_name": customer_name,
                "start": existing_start.strftime("%d.%m.%Y %H:%M"),
                "end": existing_end.strftime("%d.%m.%Y %H:%M"),
                "booking_id": booking.get('booking_id')
            })
    
    return {
        "available": len(conflicting) == 0,
        "conflicting_bookings": conflicting
    }

def load_json(path: Path) -> Any:
    """Надежно загружает JSON, возвращая список или словарь в зависимости от файла."""
    list_files = [BOOKINGS_FILE, USER_DATA_JSON, ARCHIVE_JSON]
    default = [] if path in list_files else {}
    if path == CARS_JSON:
        default = {"cars": {}}

    if not path.exists():
        if path in list_files:
            try:
                path.write_text("[]", encoding="utf-8")
            except Exception:
                pass
        return default

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            if not content:
                return default
            return json.loads(content)
    except (json.JSONDecodeError, FileNotFoundError):
        return default

def save_json(path: Path, data: Any):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    os.replace(tmp, path)

def as_cars_list(data: Any) -> List[Dict]:
    if isinstance(data, dict) and "cars" in data:
        return list(data["cars"].values())
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return list(data.values())
    return []

def car_bookings(car: Dict) -> List[Dict]:
    return [
        {"start_date": b.get("start_date"), "end_date": b.get("end_date")}
        for b in (car.get("bookings") or car.get("Bookings") or [])
    ]

def overlaps(a1, a2, b1, b2):
    return not (a2 < b1 or b2 < a1)

def is_available(car: Dict, start: date, end: date, ext_bookings: Dict) -> bool:
    car_id = car.get("id") or car.get("name")
    all_b = car_bookings(car)
    if car_id in ext_bookings:
        all_b.extend(ext_bookings[car_id])
    for b in all_b:
        bs = _parse_date(b.get("start_date"))
        be = _parse_date(b.get("end_date"))
        if bs and be and overlaps(start, end, bs, be):
            return False
    return True

def _parse_date(s: str) -> Optional[date]:
    try:
        return date.fromisoformat(str(s))
    except:
        return None

def gen_booking_id() -> str:
    return datetime.now().strftime("bk_%Y%m%d_%H%M%S_%f")

def admin_required(key: str = Query(...)):
    if key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return key

def token_required(authorization: str = Header(None)):
    if authorization is None or authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")

def load_bookings() -> List[Dict]:
    """Надежно загружает бронирования из JSON, всегда возвращая список."""
    data = load_json(BOOKINGS_FILE)
    return data if isinstance(data, list) else []

def get_user_latest_record(user_id: Union[int, str], from_archive: bool = False):
    json_file = ARCHIVE_JSON if from_archive else USER_DATA_JSON
    users_data = load_json(json_file)
    user_records = [u for u in users_data if str(u.get('user_id')) == str(user_id)]
    if not user_records:
        return None
    user_records.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return user_records[0]

def update_all_user_records(user_id: int, updates: dict, in_archive: bool = False):
    """Обновить все записи пользователя"""
    json_file = ARCHIVE_JSON if in_archive else USER_DATA_JSON
    
    if not json_file.exists():
        return False
    
    with open(json_file, "r", encoding="utf-8") as f:
        users_data = json.load(f)

    updated = False
    for user in users_data:
        if str(user.get('user_id')) == str(user_id):
            user.update(updates)
            updated = True

    if updated:
        with _lock:
            save_json(json_file, users_data)
    
    return updated


def move_to_archive(user_id: Union[int, str]):
    try:
        u_id_str = str(user_id) # Фикс типов
        if not USER_DATA_JSON.exists(): return False
        
        with open(USER_DATA_JSON, "r", encoding="utf-8") as f:
            users_data = json.load(f)
        
        # Сравниваем как строки
        user_records = [u for u in users_data if str(u.get('user_id')) == u_id_str]
        
        if not user_records:
            print(f"❌ User {u_id_str} not found")
            return False

        archive_data = load_json(ARCHIVE_JSON)
        for record in user_records:
            record['archived_at'] = datetime.utcnow().isoformat()
            record['archived'] = True # Помечаем для фильтрации
            archive_data.append(record)
        
        # Удаляем, сравнивая строки
        new_users_data = [u for u in users_data if str(u.get('user_id')) != u_id_str]
        
        with _lock:
            save_json(USER_DATA_JSON, new_users_data)
            save_json(ARCHIVE_JSON, archive_data)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def restore_from_archive(user_id: int):
    """Восстановить пользователя из архива"""
    try:
        # Читаем архив
        if not ARCHIVE_JSON.exists():
            return False
        
        with open(ARCHIVE_JSON, "r", encoding="utf-8") as f:
            archive_data = json.load(f)

        # Находим записи пользователя
        user_records = [u for u in archive_data if str(u.get('user_id')) == str(user_id)]
        if not user_records:
            return False
        
        # Читаем user_data
        with open(USER_DATA_JSON, "r", encoding="utf-8") as f:
            users_data = json.load(f)
        
        # Восстанавливаем в user_data со статусом "В работе"
        for record in user_records:
            record['status'] = 'in_work'
            record['restored_at'] = datetime.utcnow().isoformat()
            if 'archived_at' in record:
                del record['archived_at']
            users_data.append(record)
        
        # Удаляем из архива
        archive_data = [u for u in archive_data if u.get('user_id') != user_id]
        
        # Сохраняем
        with _lock:
            save_json(USER_DATA_JSON, users_data)
            save_json(ARCHIVE_JSON, archive_data)
        
        print(f"✅ Restored user {user_id} from archive ({len(user_records)} records)")
        return True
        
    except Exception as e:
        print(f"❌ Error restoring from archive: {e}")
        return False


def auto_archive_old_records():
    """Автоматическая архивация старых записей"""
    try:
        from datetime import timedelta
        
        if not USER_DATA_JSON.exists():
            return {"archived": 0, "errors": 0}
        
        with open(USER_DATA_JSON, "r", encoding="utf-8") as f:
            users_data = json.load(f)
        
        now = datetime.utcnow()
        to_archive = []
        
        # Правила архивации
        for user in users_data:
            timestamp = user.get('timestamp', '')
            try:
                user_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                continue
            
            age_days = (now - user_time).days
            current_status = user.get("status")
            
            # Правила:
            should_archive = False
            
            if current_status == 'new' and age_days > 14:
                should_archive = True  # Новые > 2 недели
            elif current_status == 'new' and age_days > 30:
                should_archive = True  # NEW > 1 месяц
            elif current_status in ['rejected', 'new']:
                should_archive = True  # Отказы и холодные сразу
            elif current_status == 'completed':
                should_archive = True  # Завершенные сразу
            
            if should_archive:
                to_archive.append(user.get('user_id'))
        
        # Архивируем
        archived_count = 0
        for user_id in set(to_archive):  # unique user_ids
            if move_to_archive(user_id):
                archived_count += 1
        
        print(f"✅ Auto-archived {archived_count} users")
        return {"archived": archived_count, "errors": 0}
        
    except Exception as e:
        print(f"❌ Error in auto_archive: {e}")
        return {"archived": 0, "errors": 1}


def filter_by_period(users_data: list, period: str) -> list:
    """Фильтровать записи по периоду"""
    from datetime import timedelta
    
    if period == 'all':
        return users_data
    
    now = datetime.utcnow()
    
    # Определяем период
    if period == 'today':
        cutoff = now - timedelta(days=1)
    elif period == 'week':
        cutoff = now - timedelta(days=7)
    elif period == '2weeks':
        cutoff = now - timedelta(days=14)
    elif period == 'month':
        cutoff = now - timedelta(days=30)
    else:
        return users_data
    
    # Фильтруем
    filtered = []
    for user in users_data:
        timestamp = user.get('timestamp', '')
        try:
            user_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if user_time >= cutoff:
                filtered.append(user)
        except:
            continue
    
    return filtered

def determine_category(car_name: str) -> str:
    car_name_lower = car_name.lower()
    if any(x in car_name_lower for x in ['yaris', 'ativ', 'city', 'mazda2', 'mg5']):
        return 'compact'
    if any(x in car_name_lower for x in ['civic', 'altis', 'camry', 'corolla']):
        return 'sedan'
    if any(x in car_name_lower for x in ['hrv', 'cx3', 'cx30', 'fortuner', 'xforce', 'mux']):
        return 'suv'
    if any(x in car_name_lower for x in ['xpander', 'veloz']):
        return '7s'
    if any(x in car_name_lower for x in ['pcx', 'click', 'bike', 'скутер', 'мото']):
        return 'bikes'
    return 'sedan'

def log_chat_to_file(user_id, role, content):
    """Логирует сообщение в файл chat_logs.jsonl."""
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "role": role,  # "user" или "assistant"
            "content": content
        }
        # 'a' - append (добавление в конец файла)
        with open(CHAT_LOGS_JSONL, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
    except Exception as e:
        print(f"❌ CRITICAL: Не удалось записать лог в {CHAT_LOGS_JSONL}: {e}")

def escape_html(text: str) -> str:
    """Replaces special characters with their HTML entities."""
    if not isinstance(text, str):
        text = str(text)
    return text.replace('&', '&').replace('<', '<').replace('>', '>')

# ==============================
# DIALOG STATUS MANAGEMENT FUNCTIONS
# ==============================


def update_dialog_status(user_id: int, **kwargs):
    """
    Обновляет статус диалога в user_data.json
    
    Параметры:
    - active: bool
    - has_new_messages: bool
    - last_message_at: str (ISO datetime)
    - last_message_from: str ("user" | "manager" | "claude")
    - message_count_increment: int
    - claude_enabled: bool
    - claude_status: str ("active" | "paused" | "stopped")
    - claude_started_at: str
    - claude_paused_at: str
    """
    try:
        print(f"🔄 Updating dialog status for user {user_id}: {kwargs}")
        
        # Читаем user_data.json
        users_data = load_json(USER_DATA_JSON)
        
        # Найдем пользователя по user_id
        user_index = next((i for i, u in enumerate(users_data) if str(u.get("user_id")) == str(user_id)), None)

        if user_index is not None:
            user_record = users_data[user_index]
        else:
            # Создаем нового пользователя если не найден
            print(f"🆕 Creating new user record for {user_id}")
            user_record = {
                "user_id": user_id,
                "username": kwargs.get("username"),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "status": "new",
                "form_started": False,
                "booking_submitted": False,
                "car_interested": None,
                "category_interested": None,
                "dates_selected": None,
                "notes": [],
                "source": "system"
            }
            # Дедупликация: удаляем старые записи с тем же user_id
            users_data = [u for u in users_data if str(u.get("user_id")) != str(user_id)]
            users_data.append(user_record)
            user_index = len(users_data) - 1
        
        # Инициализируем dialog если нет
        if "dialog" not in user_record:
            user_record["dialog"] = {
                "active": False,
                "has_new_messages": False,
                "last_message_at": datetime.utcnow().isoformat(),
                "last_message_from": "user",
                "message_count": 0,
                "claude": {
                    "enabled": False,
                    "status": "stopped",
                    "started_at": None,
                    "paused_at": None
                }
            }
        
        dialog = user_record["dialog"]
        
        # Обновляем нужные поля из kwargs
        if "active" in kwargs:
            dialog["active"] = kwargs["active"]
        
        if "has_new_messages" in kwargs:
            dialog["has_new_messages"] = kwargs["has_new_messages"]
        
        if "last_message_at" in kwargs:
            dialog["last_message_at"] = kwargs["last_message_at"]
        
        if "last_message_from" in kwargs:
            dialog["last_message_from"] = kwargs["last_message_from"]
        
        if "message_count_increment" in kwargs:
            dialog["message_count"] = dialog.get("message_count", 0) + kwargs["message_count_increment"]
        
        if "claude_enabled" in kwargs:
            dialog["claude"]["enabled"] = kwargs["claude_enabled"]
        
        if "claude_status" in kwargs:
            dialog["claude"]["status"] = kwargs["claude_status"]
        
        if "claude_started_at" in kwargs:
            dialog["claude"]["started_at"] = kwargs["claude_started_at"]
        
        if "claude_paused_at" in kwargs:
            dialog["claude"]["paused_at"] = kwargs["claude_paused_at"]
        
        # Обновляем updated_at
        user_record["updated_at"] = datetime.utcnow().isoformat()
        
        # Сохраняем обратно
        users_data[user_index] = user_record
        save_json(USER_DATA_JSON, users_data)
        
        print(f"✅ Dialog status updated for user {user_id}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating dialog status for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_derived_ai_status(user_id):
    """Вычисляет статус Claude, просто глядя на последний action в истории"""
    try:
        # Загружаем историю (у тебя это обычно список словарей из JSON или БД)
        history = get_dialog_history(user_id) # Твоя функция получения списка событий
        
        if not history:
            return "idle"

        # Идем с конца истории к началу
        for event in reversed(history):
            action = event.get('action')
            
            if action in ['claude_start', 'claude_resume']:
                return "active"
            if action == 'claude_pause':
                return "paused"
            if action == 'claude_stop':
                return "idle"
                
        return "idle"
    except Exception as e:
        print(f"Error deriving status: {e}")
        return "idle"

def get_last_message_info(user_id):
    """Вычисляет, кто был последним и сколько сообщений, по истории"""
    history = get_dialog_history(user_id)
    messages = [e for e in history if e.get('action') == 'message']
    
    if not messages:
        return {"from": None, "count": 0, "has_new": False}
        
    last_msg = messages[-1]
    return {
        "from": last_msg.get('from'), # 'user', 'manager', 'claude'
        "count": len(messages),
        "has_new": any(m.get('unread') for m in messages)
    }


def get_all_dialog_statuses():
    statuses = {}
    history_file = DATA / "crm_history.jsonl"
    
    if not history_file.exists():
        return {}

    with open(history_file, "r", encoding="utf-8") as f:
        for line in f:
            try:
                ev = json.loads(line.strip())
                uid = str(ev.get("user_id")) # Приводим к строке для ключа
                action = ev.get("action")
                
                if uid not in statuses:
                    statuses[uid] = {
                        "claude_status": "stopped",
                        "has_new_messages": False,
                        "last_note": "",
                        "last_action_at": ev.get("timestamp")
                    }
                
                entry = statuses[uid]
                entry["last_action_at"] = ev.get("timestamp")

                # 1. ЛОГИКА AI (Твой запрос)
                if action == "claude_started":
                    entry["claude_status"] = "active"
                elif action == "claude_stopped":
                    entry["claude_status"] = "stopped"
                elif action == "claude_paused":
                    entry["claude_status"] = "paused"

                # 2. ЛОГИКА СООБЩЕНИЙ (Подсветка новых)
                elif action == "user_message_received":
                    entry["has_new_messages"] = True # Нужно ответить!
                elif action in ["manager_message_sent", "messages_marked_read"]:
                    entry["has_new_messages"] = False # Ответили или прочитали

                # 3. ЛОГИКА ЗАМЕТОК (То самое "как статус в WhatsApp")
                elif action == "note_added":
                    entry["last_note"] = ev.get("note", "")

                # 4. ЛОГИКА БРОНИРОВАНИЯ (Опционально)
                elif action == "booking_submitted":
                    entry["has_booking"] = True

            except: continue
            
    return statuses

def log_dialog_event(user_id: Union[int, str], action: str, data: dict = None, **kwargs):
    """
    Универсальная версия: принимает и словарь, и отдельные аргументы
    """
    try:
        # Объединяем данные из словаря и из kwargs
        extra_data = data if isinstance(data, dict) else {}
        extra_data.update(kwargs)

        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,
            **extra_data  # Распаковываем всё накопленное сюда
        }

        history_file = DATA / "crm_history.jsonl"
        with open(history_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

        print(f"📝 Dialog event logged: {action} for user {user_id}")
        return True

    except Exception as e:
        print(f"❌ Error logging dialog event: {e}")
        return False
    
def get_dialog_status_from_history(user_id: int):
    """
    Получает статус диалога из истории событий и сообщений

    Возвращает:
    - active: bool - есть ли активный диалог
    - has_new_messages: bool - есть ли новые непрочитанные сообщения
    - last_message_at: str - время последнего сообщения
    - last_message_from: str - от кого последнее сообщение
    - message_count: int - количество сообщений в диалоге
    - claude_status: str - статус Claude (active/paused/stopped)
    """
    try:
        # Читаем события диалога из crm_history.jsonl
        history_file = DATA / "crm_history.jsonl"
        events = []
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        if str(event.get("user_id")) == str(user_id):
                            events.append(event)
                    except json.JSONDecodeError:
                        continue

        # Читаем сообщения из chat_logs.jsonl
        chat_file = DATA / "chat_logs.jsonl"
        messages = []
        if chat_file.exists():
            with open(chat_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        msg = json.loads(line.strip())
                        # Convert both to same type for comparison
                        msg_user_id = msg.get("user_id")
                        if str(msg_user_id) == str(user_id):
                            messages.append(msg)
                    except json.JSONDecodeError:
                        continue

        # Debug removed

        # Сортируем по времени
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        # Анализируем события
        claude_status = "stopped"
        messages_marked_read = False

        # Определяем статус Claude из событий
        for event in events:
            action = event.get("action")
            if action == "claude_started":
                claude_status = "active"
            elif action == "claude_paused":
                claude_status = "paused"
            elif action == "claude_stopped":
                claude_status = "stopped"
            elif action == "claude_resumed":
                claude_status = "active"
            elif action == "messages_marked_read":
                messages_marked_read = True

        # Анализируем сообщения
        message_count = len(messages)
        has_new_messages = False
        last_message_at = None
        last_message_from = None

        if messages:
            last_msg = messages[0]  # Уже отсортированы по времени
            last_message_at = last_msg.get("timestamp")
            last_message_from = last_msg.get("role")  # "user" или "assistant" (Claude)

            # Определяем новые сообщения: если последнее сообщение от пользователя и не отмечено как прочитанное
            if last_msg.get("role") == "user" and not messages_marked_read:
                has_new_messages = True

        # Диалог активен если есть сообщения (независимо от времени) или Claude активен
        active = False
        if message_count > 0 or claude_status == "active":
            active = True

        return {
            "active": active,
            "has_new_messages": has_new_messages,
            "last_message_at": last_message_at,
            "last_message_from": last_message_from,
            "message_count": message_count,
            "claude_status": claude_status
        }

    except Exception as e:
        print(f"❌ Error getting dialog status for user {user_id}: {e}")
        return {
            "active": False,
            "has_new_messages": False,
            "last_message_at": None,
            "last_message_from": None,
            "message_count": 0,
            "claude_status": "stopped"
        }

def get_dialog_events(user_id: int, limit: int = 50):
    """
    Получает историю событий диалога пользователя
    """
    try:
        history_file = DATA / "crm_history.jsonl"
        events = []
        
        # Читаем историю событий
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        if str(event.get("user_id")) == str(user_id):
                            events.append(event)
                    except json.JSONDecodeError:
                        continue

        # Сортируем по времени (новые сверху) и ограничиваем количество
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        events = events[:limit]
        
        print(f"📊 Found {len(events)} dialog events for user {user_id}")
        return events
        
    except Exception as e:
        print(f"❌ Error getting dialog events for user {user_id}: {e}")
        return []

def get_dialog_status(user_id: int) -> dict:
    """
    Получает статус диалога для пользователя
    """
    try:
        users_data = load_json(USER_DATA_JSON)
        user_record = next((u for u in users_data if str(u.get("user_id")) == str(user_id)), None)
        
        if not user_record or "dialog" not in user_record:
            return {
                "active": False,
                "has_new_messages": False,
                "last_message_at": None,
                "last_message_from": None,
                "message_count": 0,
                "claude": {
                    "enabled": False,
                    "status": "stopped",
                    "started_at": None,
                    "paused_at": None
                }
            }
        
        return user_record["dialog"]
        
    except Exception as e:
        print(f"❌ Error getting dialog status for user {user_id}: {e}")
        return {}

# ==============================
# CLAUDE INTEGRATION - GLOBAL VARIABLES
# ==============================

# Global variables for Claude conversation management
user_conversations = {}  # {user_id: {"status": "active/paused/ended", "history": [], "filters": {}}}
user_sessions = {}       # {user_id: {"claude_initiated": bool, ...}}
user_filters_cache = {}  # {user_id: {days, category, startDate, endDate, ...}}

# Claude client initialization
claude_client = None
if ANTHROPIC_API_KEY:
    try:
        claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        print(f"✅ Claude client initialized with model: {CLAUDE_MODEL}")
    except Exception as e:
        print(f"❌ Failed to initialize Claude client: {e}")
        claude_client = None
else:
    print("⚠️ ANTHROPIC_API_KEY not found. Claude integration disabled.")

# ==============================
# CLAUDE DIALOG SYSTEM FUNCTIONS
# ==============================

def initiate_claude_dialogue(user_id, user_filters=None):
    """Запускает диалог Claude с подбором машин"""
    print(f"🤖 Initiating Claude dialogue for user {user_id}")
    
    if user_id in user_conversations and user_conversations[user_id].get("status") == "active":
        print(f"Dialogue with user {user_id} is already active.")
        return {"status": "already_active", "message": "Диалог уже активен"}
    
    if user_id in user_sessions and user_sessions[user_id].get("claude_initiated"):
        print(f"Claude already initiated for user {user_id}.")
        return {"status": "already_initiated", "message": "Claude уже был инициализирован"}
    
    try:
        # Активируем диалог сразу
        user_conversations[user_id] = {
            "status": "active",
            "history": [],
            "filters": user_filters or {}
        }
        
        if user_id not in user_sessions:
            user_sessions[user_id] = {}
        user_sessions[user_id]["claude_initiated"] = True

        # Сразу запускаем подбор вариантов
        handle_claude_best_options(user_id)
        
        print(f"✅ Claude dialogue initiated for user {user_id}")
        return {"status": "success", "message": "Диалог Claude запущен"}
        
    except Exception as e:
        print(f"❌ Failed to initiate dialogue with user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Ошибка запуска диалога: {str(e)}"}

def handle_claude_best_options(user_id):
    """Claude генерирует текст и отправляет его на внутренний эндпоинт для доставки юзеру"""
    try:
        # 1. Получаем данные из диалогов (как и раньше)
        if user_id not in user_conversations:
            return {"status": "error", "message": "Пользователь не найден"}
        
        user_filters = user_conversations[user_id].get("filters") or {}
        days = user_filters.get('days', '')
        start_date = user_filters.get('start_date', '')
        end_date = user_filters.get('end_date', '')
        
        date_info = f"{start_date} — {end_date}" if start_date else f"{days} дн."

        # 2. Формируем краткий промпт (только квалификация)
        user_request = (
            f"Начни ответ СТРОГО с фразы: 'Ищешь что-то определенное? Могу подсказать.' "
            f"Задай ОДИН короткий вопрос касающий потребности снять транспорт на Пхукете."
        )
        
        # 3. Получаем текст от Клода
        result = process_claude_message(user_id, user_request)
        
        if result.get("status") == "success":
            ai_text = result.get("response_text")
            
            # --- ОТПРАВКА НА ВАШ ЭНДПОИНТ ---
            internal_url = "http://localhost:5001/internal/send_message" # Проверьте ваш порт!
            payload = {
                "user_id": user_id,
                "text": ai_text
            }
            
            try:
                # Отправляем POST запрос на ваш же бэкенд
                response = requests.post(internal_url, json=payload, timeout=5)
                
                if response.status_code == 200:
                    print(f"✅ Квалификация успешно улетела через /internal/send_message для {user_id}")
                    result["delivered"] = True
                else:
                    print(f"⚠️ Эндпоинт вернул ошибку {response.status_code}: {response.text}")
                    result["delivered"] = False
                    
            except Exception as e:
                print(f"❌ Не удалось достучаться до внутреннего эндпоинта: {e}")
                result["delivered"] = False
            # --------------------------------
            
        return result
        
    except Exception as e:
        print(f"❌ Ошибка в handle_claude_best_options: {e}")
        return {"status": "error", "message": str(e)}
    
    
def process_claude_message(user_id, user_input):
    """Обрабатывает сообщение через Claude API"""
    try:
        print(f"🚀 process_claude_message called for {user_id}")
        
        if user_id not in user_conversations:
            print(f"❌ user_id {user_id} not in user_conversations!")
            return {"status": "error", "message": "Пользователь не найден в активных диалогах"}
        
        if not claude_client:
            return {"status": "error", "message": "Claude клиент не инициализирован"}
        
        conversation_history = user_conversations[user_id]["history"]
        conversation_history.append({"role": "user", "content": user_input})

        # Формируем контекст с полной галереей
        cars_context = "\n\nДОСТУПНЫЕ МАШИНЫ:\n"
        
        if CAR_LIST_JSON and 'cars' in CAR_LIST_JSON:
            for car_id, car in CAR_LIST_JSON['cars'].items():
                # Пропускаем недоступные
                if not car.get('available', True):
                    continue
                
                name = car.get('name', 'Без названия')
                car_class = car.get('class', '').upper()
                
                # Цены
                pricing = car.get('pricing', {})
                season_pricing = pricing.get('high_season', {}) or pricing.get('low_season', {})
                
                p_1_6 = season_pricing.get('price_1_6', 0)
                p_7_14 = season_pricing.get('price_7_14', 0)
                p_15_29 = season_pricing.get('price_15_29', 0)
                p_30 = season_pricing.get('price_30_plus', 0)
                deposit = pricing.get('deposit', 5000)
                
                cars_context += (
                    f"\n{name} ({car_class})\n"
                    f"Цены: 1-6д={p_1_6}฿ | 7-14д={p_7_14}฿ | 15-29д={p_15_29}฿ | 30+д={p_30}฿\n"
                    f"Депозит: {deposit}฿\n"
                )
                
                # Показываем всю галерею
                photos = car.get('photos', {})
                
                # Main фото
                main_photo = photos.get('main', '')
                if main_photo:
                    cars_context += f"Главное фото: [image:{main_photo}]\n"
                
                # Вся галерея
                gallery = photos.get('gallery', [])
                if gallery and len(gallery) > 0:
                    gallery_paths = ', '.join([f"[image:{p}]" for p in gallery])
                    cars_context += f"Все фото: {gallery_paths}\n"
        
        # Системный промпт с инструкциями
        system_prompt = CLAUDE_SYSTEM_PROMPT + cars_context
        system_prompt += """

ПРАВИЛА ОТПРАВКИ ФОТО:
- ВСЕГДА используй формат [image:путь] для отправки фото
- НЕ используй markdown-разметку типа ![alt](image:path) - это НЕ РАБОТАЕТ
- Для первого показа машины: используй ГЛАВНОЕ фото [image:main_photo]
- Если клиент просит "ещё фото", "покажи больше фото", "хочу все фото" - используй фото из галереи
- Можешь отправить 2-6 фото одной машины если клиент просит
- НЕ отправляй все фото сразу без запроса
"""
        
        # Определяем это первое сообщение или нет
        is_first_message = len(conversation_history) == 1
        max_tokens = 300 if is_first_message else 250
        
        # Вызов Claude
        print(f"🤖 Calling Claude API (first_msg={is_first_message}, max_tokens={max_tokens})...")
        print(f"🤖 API Key available: {bool(ANTHROPIC_API_KEY)}")
        print(f"🤖 Model: {CLAUDE_MODEL}")
        
        try:
            # Прямой HTTP вызов к API Anthropic (для SDK 0.75.0)
            headers = {
                "x-api-key": ANTHROPIC_API_KEY,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-access": "true"
            }
            
            data = {
                "model": CLAUDE_MODEL,
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": conversation_history
            }
            
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"🤖 Response type: {type(result)}")
            print(f"🤖 Response content: {result}")
            claude_response_raw = result["content"][0]["text"]
        except Exception as e:
            print(f"❌ Claude API Error: {e}")
            print(f"❌ Error type: {type(e)}")
            import traceback
            traceback.print_exc()
            raise

        # Логирование
        try:
            log_chat_to_file(user_id, "user", user_input)
            log_chat_to_file(user_id, "assistant", claude_response_raw)
            
            # TODO: Добавить уведомление в группу если нужно
            # if ACTIVE_DIALOGS_CHAT_ID:
            #     safe_send_message(
            #         ACTIVE_DIALOGS_CHAT_ID,
            #         f"👤 {user_id}: {user_input[:100]}\n\n🤖 Claude: {claude_response_raw[:150]}...",
            #         parse_mode="HTML"
            #     )
        except Exception as e:
            print(f"⚠️ Logging error: {e}")

        # Убираем **
        claude_response_raw = claude_response_raw.replace('**', '')
        
        # Парсим фото - поддерживаем оба формата: [image:path] и ![alt](image:path)
        photos_to_send = []
        text_to_send = claude_response_raw
        
        if '[image:' in claude_response_raw or '](image:' in claude_response_raw:
            import re
            # Ищем оба формата: [image:path] и ![alt](image:path)
            image_matches = re.findall(r'\[image:([^\]]+)\]', claude_response_raw)
            markdown_matches = re.findall(r'!\[[^\]]*\]\((image:[^)]+)\)', claude_response_raw)
            all_matches = image_matches + markdown_matches
            
            # Убираем дубликаты но сохраняем порядок
            seen = set()
            photos_to_send = []
            for p in all_matches:
                if p not in seen:
                    seen.add(p)
                    photos_to_send.append(p)
            
            # Удаляем оба формата из текста
            text_to_send = re.sub(r'\[image:[^\]]+\]', '', claude_response_raw)
            text_to_send = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', text_to_send).strip()
            print(f"📸 Found {len(photos_to_send)} unique photos to send")

        # Сохраняем в историю
        conversation_history.append({"role": "assistant", "content": claude_response_raw})
        
        print(f"✅ Message processed for {user_id}")
        
        return {
            "status": "success",
            "message": "Сообщение обработано",
            "response_text": text_to_send,
            "photos": photos_to_send,
            "raw_response": claude_response_raw
        }

    except Exception as e:
        print(f"❌ Error in process_claude_message: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Ошибка обработки сообщения: {str(e)}"}

# ==============================
# HELPER ФУНКЦИЯ - добавь ПЕРЕД endpoints
# ==============================

def notify_telegram_bot_about_filters(user_id: Union[int, str], filters: dict, username: str = None) -> bool:
    """Уведомляет Telegram бота о теплом лиде (filters_used) - для всех пользователей (Telegram и Web)"""
    try:
        # ✅ ИСПРАВЛЕНИЕ: Отправляем уведомления для всех пользователей (и Telegram, и Web)
        print(f"📤 Notifying bot about warm lead {user_id}")
        print(f"📤 User type: {'Telegram' if isinstance(user_id, int) else 'Web Session'}")
        
        # ✅ ИСПРАВЛЕНИЕ: Правильное определение webhook URL
        TG_WEBHOOK_URL = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001")
        # Убираем trailing slash если есть
        if TG_WEBHOOK_URL.endswith('/'):
            TG_WEBHOOK_URL = TG_WEBHOOK_URL[:-1]
        url = f"{TG_WEBHOOK_URL}/botapi/notify/filters-used"
        
        print(f"📤 Notifying bot about warm lead {user_id}")
        print(f"📤 URL: {url}")
        print(f"📤 Filters: {filters}")
        
        filters['username'] = username
        
        response = requests.post(
            url,
            json={"user_id": user_id, "filters": filters},
            timeout=5,
            headers={"Content-Type": "application/json"}
        )
        log_dialog_event(
            user_id=user_id,
            action="dialog_continued",
            initiated_by="user",
            event_type="filters_used",
            filters=filters,
            username=username
        )
        
        if response.status_code == 200:
            print(f"✅ Bot notified about warm lead {user_id}")
            return True
        else:
            print(f"⚠️ Bot returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error notifying bot about filters: {e}")
        import traceback
        traceback.print_exc()
        return False


def notify_telegram_bot_about_webapp_opened(user_id: Union[int, str], username: str = None) -> bool:
    """Уведомляет Telegram бота о входе в webapp - для всех пользователей (Telegram и Web)"""
    try:
        # ✅ ИСПРАВЛЕНИЕ: Отправляем уведомления для всех пользователей (и Telegram, и Web)
        print(f"📤 Notifying bot about webapp opened: {user_id}")
        print(f"📤 User type: {'Telegram' if isinstance(user_id, int) else 'Web Session'}")
        
        # ✅ ИСПРАВЛЕНИЕ: Правильное определение webhook URL
        TG_WEBHOOK_URL = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001")
        if TG_WEBHOOK_URL.endswith('/'):
            TG_WEBHOOK_URL = TG_WEBHOOK_URL[:-1]
        url = f"{TG_WEBHOOK_URL}/botapi/notify/webapp-opened"
        
        print(f"📤 Notifying bot about webapp opened: {user_id}")
        print(f"📤 URL: {url}")
        print(f"📤 Username: {username}")
        
        response = requests.post(
            url,
            json={"user_id": user_id, "username": username},
            timeout=5,
            headers={"Content-Type": "application/json"}
        )
        
        log_dialog_event(
            user_id=user_id,
            action="dialog_started",
            initiated_by="user",
            username=username
        )
        
        if response.status_code == 200:
            print(f"✅ Bot notified about webapp opened {user_id}")
            return True
        else:
            print(f"⚠️ Bot returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error notifying bot about webapp opened: {e}")
        import traceback
        traceback.print_exc()
        return False


def notify_telegram_bot_about_booking(booking_id: str, user_id: Union[int, str], form_data: dict, username: str = None):
    """Уведомляет Telegram бота о новой брони - для всех пользователей (Telegram и Web)"""
    try:
        # ✅ ИСПРАВЛЕНИЕ: Отправляем уведомления для всех пользователей (и Telegram, и Web)
        print(f"📤 Notifying bot about booking: {user_id}")
        print(f"📤 User type: {'Telegram' if isinstance(user_id, int) else 'Web Session'}")
        
        # ✅ ИСПРАВЛЕНИЕ: Правильное определение webhook URL
        TG_WEBHOOK_URL = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001")
        if TG_WEBHOOK_URL.endswith('/'):
            TG_WEBHOOK_URL = TG_WEBHOOK_URL[:-1]
        url = f"{TG_WEBHOOK_URL}/botapi/notify/booking-submitted"
        
        print(f"📤 Notifying bot about booking {booking_id}")
        print(f"📤 URL: {url}")
        print(f"📤 User ID: {user_id}")
        print(f"📤 Username: {username}")
        
        form_data['username'] = username
        
        response = requests.post(
            url,
            json={
                "booking_id": booking_id,
                "user_id": user_id,
                "form_data": form_data
            },
            timeout=5,
            headers={"Content-Type": "application/json"}
        )
        
        log_dialog_event(
            user_id=user_id,
            action="booking_submitted",
            initiated_by="user",
            booking_id=booking_id,
            form_data=form_data,
            username=username
        )
        
        if response.status_code == 200:
            print(f"✅ Bot notified about booking {booking_id}")
            return True
        else:
            print(f"⚠️ Bot returned {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error notifying bot about booking: {e}")
        import traceback
        traceback.print_exc()
        return False
    
# ==============================
# ЭНДПОИНТЫ
# ==============================

@app.get("/")
def root():
    return {"ok": True, "msg": "Sunny Rentals API v1.0.1"}


@app.post(API_PREFIX + "/login")
def login(login_request: LoginRequest):
    if login_request.username == ADMIN_USERNAME and login_request.password == ADMIN_PASSWORD:
        return {"ok": True, "token": AUTH_TOKEN}
    else:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

@app.get(API_PREFIX + "/cars")
def get_cars(category: Optional[str] = None):
    raw = load_json(CARS_JSON)
    cars = as_cars_list(raw)
    if category:
        cars = [c for c in cars if (c.get("class") or c.get("category") or "").lower() == category.lower()]
    
    content = {"cars": cars, "count": len(cars)}
    headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return JSONResponse(content=content, headers=headers)

@app.get(API_PREFIX + "/available-cars")
def get_available_cars(
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    category: Optional[str] = None
):
    sd = _parse_date(start_date)
    ed = _parse_date(end_date)
    if not sd or not ed or ed < sd:
        raise HTTPException(400, "Invalid dates")
    
    cars_raw = load_json(CARS_JSON)
    cars = as_cars_list(cars_raw)
    ext_bookings = load_json(BOOKINGS_JSON)
    if not isinstance(ext_bookings, dict):
        ext_bookings = {}

    if category:
        cars = [c for c in cars if (c.get("class") or c.get("category") or "").lower() == category.lower()]

    available = [c for c in cars if (c.get('available') is True or c.get('available') is None) and is_available(c, sd, ed, ext_bookings)]
    return {
        "available_cars": [c.get("id") or c.get("name") for c in available],
        "available": available,
        "count": len(available)
    }
    


@app.get(API_PREFIX + "/bookings")
def get_bookings(user_id: str | None = None):
    try:
        bookings = load_bookings()
        if user_id:
            bookings = [b for b in bookings if str(b.get("user_id")) == str(user_id)]
        bookings.sort(key=lambda x: x.get("form_data", {}).get("timestamp", ""), reverse=True)
        return {"status": "ok", "bookings": bookings, "count": len(bookings)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "bookings": [], "count": 0}
        )



@app.get(API_PREFIX + "/bookings/logistics", response_model=List[LogisticsDate])
async def get_bookings_logistics():
    """
    Возвращает даты выдачи и возврата для всех броней
    Используется для корректного отображения бейджей в календаре
    """
    try:
        with open(BOOKINGS_FILE, 'r', encoding='utf-8') as f:
            bookings = json.load(f)
        
        logistics_data = []
        
        for booking in bookings:
            # Извлекаем даты из разных возможных мест
            start_date = (
                booking.get('form_data', {}).get('dates', {}).get('start') or 
                booking.get('start_date')
            )
            end_date = (
                booking.get('form_data', {}).get('dates', {}).get('end') or 
                booking.get('end_date')
            )
            
            if not start_date or not end_date:
                continue
                
            # Извлекаем информацию об авто
            car_info = booking.get('form_data', {}).get('car', {})
            car_name = car_info.get('model') or car_info.get('name') or 'Авто'
            car_id = car_info.get('id', '')
            
            # Извлекаем информацию о клиенте
            client_name = booking.get('form_data', {}).get('contact', {}).get('name') or 'Клиент'
            location = booking.get('form_data', {}).get('locations', {}).get('pickupLocation') or ''
            
            logistics_data.append({
                'booking_id': booking.get('booking_id', '') or '',
                'car_id': car_id or '',
                'car_name': car_name or 'Авто',
                'pickup_date': start_date or '',
                'return_date': end_date or '',
                'client_name': client_name or 'Клиент',
                'location': location or ''
            })
        
        return logistics_data
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Bookings file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON in bookings file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading bookings: {str(e)}")


@app.get(API_PREFIX + "/bookings/logistics/summary")
async def get_logistics_summary():
    """
    Возвращает сводку по датам логистики
    Группирует выдачи и возвраты по дням
    """
    try:
        with open(BOOKINGS_FILE, 'r', encoding='utf-8') as f:
            bookings = json.load(f)
        
        # Словари для группировки по датам
        pickups_by_date = {}
        returns_by_date = {}
        
        for booking in bookings:
            start_date = (
                booking.get('form_data', {}).get('dates', {}).get('start') or 
                booking.get('start_date')
            )
            end_date = (
                booking.get('form_data', {}).get('dates', {}).get('end') or 
                booking.get('end_date')
            )
            
            if not start_date or not end_date:
                continue
            
            # Извлекаем только дату без времени для группировки
            pickup_date = start_date.split('T')[0] if 'T' in start_date else start_date.split(' ')[0]
            return_date = end_date.split('T')[0] if 'T' in end_date else end_date.split(' ')[0]
            
            # Считаем выдачи
            if pickup_date not in pickups_by_date:
                pickups_by_date[pickup_date] = 0
            pickups_by_date[pickup_date] += 1
            
            # Считаем возвраты
            if return_date not in returns_by_date:
                returns_by_date[return_date] = 0
            returns_by_date[return_date] += 1
        
        return {
            'pickups': pickups_by_date,
            'returns': returns_by_date
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post(API_PREFIX + "/leads/track")
def track_lead_event(request: LeadTrackRequest):
    """Track user events - ONE record per user"""
    try:
        # Handle both Telegram IDs (int) and session IDs (str)
        user_id = request.user_id
        event_type = request.event_type
        event_data = request.data or {}
        username = request.username

        # Enhanced diagnostic logging
        print(f"🔍 track_lead_event: user_id={user_id} (type: {type(user_id).__name__}), event_type={event_type}")
        print(f"🔍 User ID analysis: isinstance(user_id, int)={isinstance(user_id, int)}, isinstance(user_id, str)={isinstance(user_id, str)}")
        
        users_data = load_json(USER_DATA_JSON)
        
        # Log existing user data analysis
        print(f"📊 User database analysis:")
        print(f"   - Total users in database: {len(users_data)}")
        
        # Check for existing user with detailed analysis
        existing_users = []
        for i, u in enumerate(users_data):
            db_user_id = u.get("user_id")
            if str(db_user_id) == str(user_id):
                existing_users.append({"index": i, "user_id": db_user_id, "type": type(db_user_id).__name__})
        
        print(f"   - Users matching current user_id: {len(existing_users)}")
        for user in existing_users:
            print(f"     * Index {user['index']}: user_id={user['user_id']} (type: {user['type']})")

        # Найти существующего пользователя (handle both int and str comparison)
        user_index = next((i for i, u in enumerate(users_data) if str(u.get("user_id")) == str(user_id)), None)
        
        if user_index is not None:
            user_record = users_data[user_index]
            # Обновляем username если он изменился
            if username and username != user_record.get("username"):
                user_record["username"] = username
        else:
            # Создаем нового пользователя
            user_record = {
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
                "source": "telegram_webapp"
            }
            print(f"🆕 Новый пользователь: {user_id} (@{username})")

        # === ОБРАБОТКА СОБЫТИЙ ===
        
        # 1. ОТКРЫТИЕ WEBAPP
        if event_type == "webapp_opened":
            print(f"📱 Пользователь {user_id} открыл webapp")
            # Уведомляем только если это новый пользователь И это Telegram пользователь (int)
            # ДИАГНОСТИКА: Отправляем уведомления для всех типов пользователей
            if user_index is None:
                print(f"🔍 DIAGNOSTIC: НОВЫЙ пользователь {user_id} (тип: {type(user_id).__name__}) - отправляем webapp_opened")
                notify_result = notify_telegram_bot_about_webapp_opened(user_id, username)
                print(f"🔍 DIAGNOSTIC: Результат уведомления webapp_opened: {notify_result}")
        
        # 2. ИСПОЛЬЗОВАНИЕ ФИЛЬТРОВ (теплый лид)
        elif event_type == "filters_used":
            print(f"🌡️ Пользователь {user_id} использовал фильтры")
            user_record["form_started"] = True
            # НЕ сбрасываем статус на new если пользователь уже существует
            if user_index is None:
                user_record["status"] = "new"
            user_record["updated_at"] = datetime.utcnow().isoformat()
            
            # Сохраняем категорию интереса
            if "category" in event_data:
                user_record["category_interested"] = event_data["category"]
                print(f"🚗 Категория интереса: {event_data['category']}")
            
            # Сохраняем выбранные даты
            if "startDate" in event_data and "endDate" in event_data:
                user_record["dates_selected"] = {
                    "start": event_data["startDate"],
                    "end": event_data["endDate"],
                    "days": event_data.get("days", 1)
                }
                print(f"📅 Даты: {event_data['startDate']} - {event_data['endDate']} ({event_data.get('days', 1)} дней)")
            
            # ДИАГНОСТИКА: Отправляем уведомления для всех типов пользователей
            print(f"🔍 DIAGNOSTIC: filters_used для пользователя {user_id} (тип: {type(user_id).__name__})")
            notify_result = notify_telegram_bot_about_filters(user_id, event_data, username)
            print(f"🔍 DIAGNOSTIC: Результат уведомления filters_used: {notify_result}")

        # 3. БРОНИРОВАНИЕ (горячий лид)
        elif event_type == "booking_submitted":
            print(f"🔥 Пользователь {user_id} отправил бронирование")
            user_record["booking_submitted"] = True
            user_record["status"] = "pre_booking"
            user_record["updated_at"] = datetime.utcnow().isoformat()
            
            # Сохраняем информацию о машине
            if "car" in event_data:
                car_info = event_data["car"]
                # Формируем полное название машины
                car_parts = [
                    car_info.get("brand", ""),
                    car_info.get("model", ""),
                    car_info.get("year", ""),
                    car_info.get("color", "")
                ]
                car_name = " ".join([part for part in car_parts if part]).strip()
                user_record["car_interested"] = car_name or car_info.get("name", "Unknown")
                
                # Сохраняем категорию если есть
                if "category" in car_info:
                    user_record["category_interested"] = car_info["category"]
                
                print(f"🚗 Машина забронирована: {user_record['car_interested']}")

            # Сохраняем даты если есть
            if "dates" in event_data:
                user_record["dates_selected"] = {
                    "start": event_data["dates"].get("start"),
                    "end": event_data["dates"].get("end"),
                    "days": event_data["dates"].get("days", 1)
                }

        # Обновляем запись пользователя
        # Дедупликация: удаляем старые записи с тем же user_id перед сохранением
        users_data = [u for u in users_data if str(u.get("user_id")) != str(user_id)]
        users_data.append(user_record)

        # Сохраняем данные пользователей
        save_json(USER_DATA_JSON, users_data)

        print(f"✅ Пользователь {user_id}: {event_type} → статус: {user_record['status']}")

        return {
            "status": "ok",
            "current_status": user_record["status"],
            "action": event_type,
            "user_id": user_id,
            "user_type": "telegram" if isinstance(user_id, int) else "web_session"
        }

    except Exception as e:
        print(f"❌ Ошибка в track_lead_event: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



# УДАЛЕН ДУБЛИРОВАННЫЙ ENDPOINT - используется первый вариант выше
    
    
# --- ГАЛЕРЕЯ ---
@app.get(API_PREFIX + "/gallery")
def list_gallery(dir: str = Query(..., alias="dir")):
    try:
        rel = unquote(dir).lstrip("/")
        abs_dir = IMAGES / rel
        if not abs_dir.is_dir() or not str(abs_dir).startswith(str(IMAGES)):
            raise HTTPException(400, "Invalid folder")

        exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        files = [f for f in os.listdir(abs_dir) if (abs_dir / f).is_file() and Path(f).suffix.lower() in exts]
        files_1 = [f for f in files if f.lower() == "1.jpg"]
        files_rest = sorted(f for f in files if f.lower() != "1.jpg")
        ordered = files_1 + files_rest
        images = [f"/images_web/{rel}/{f}" for f in ordered]
        return {"folder": dir, "count": len(images), "images": images}
    except Exception as e:
        raise HTTPException(400, str(e))

# ==============================
# CRM API
# ==============================
def crm_admin_required(admin_id: str = Query(..., description="Telegram User ID for authorization")):
    if not admin_id or admin_id != ADMIN_ID:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return admin_id


# Вспомогательная функция для вычисления статуса из истории событий
def get_computed_dialog_data(user_id: int):
    """
    Вычисляет статус AI и инфо о сообщениях, просто читая историю событий.
    В БД ничего не пишем.
    """
    # Путь к файлу событий (подправь, если у тебя другая папка)
    events_file = Path(f"data/dialogs/events_{user_id}.json")
    
    # Значения по умолчанию
    data = {
        "claude_status": "idle",
        "last_message_from": None,
        "message_count": 0,
        "has_new_messages": False
    }

    if not events_file.exists():
        return data

    try:
        with open(events_file, 'r', encoding='utf-8') as f:
            events = json.load(f)
        
        if not events:
            return data

        # Считаем сообщения
        messages = [e for e in events if e.get('action') == 'message']
        data["message_count"] = len(messages)
        
        if messages:
            data["last_message_from"] = messages[-1].get('from')
            # Если последнее сообщение от юзера и оно не помечено как прочитанное
            data["has_new_messages"] = (messages[-1].get('from') == 'user' and 
                                      not messages[-1].get('read', False))

        # Вычисляем статус AI (идем с конца истории)
        for event in reversed(events):
            action = event.get('action')
            if action in ['claude_start', 'claude_resume']:
                data["claude_status"] = "active"
                break
            if action == 'claude_pause':
                data["claude_status"] = "paused"
                break
            if action == 'claude_stop':
                data["claude_status"] = "idle"
                break
                
        return data
    except Exception as e:
        print(f"⚠️ Ошибка парсинга истории для {user_id}: {e}")
        return data

def get_fast_dialog_map():
    """
    Собирает статусы ВСЕХ диалогов за один проход по хвосту файла.
    Это в 100 раз быстрее, чем читать файл для каждого юзера отдельно.
    """
    statuses = {}
    
    def process_file(path, is_chat=False):
        if not path.exists(): return
        # Читаем только последние 1000 строк (хватит для актуальных статусов)
        try:
            cmd = ["tail", "-n", "1000", str(path)]
            lines = subprocess.check_output(cmd).decode('utf-8').splitlines()
        except:
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()[-1000:]

        for line in lines:
            try:
                ev = json.loads(line.strip())
                uid = str(ev.get("user_id"))
                if uid not in statuses:
                    statuses[uid] = {"claude_status": "stopped", "has_new_messages": False, "message_count": 0}
                
                entry = statuses[uid]
                
                if is_chat:
                    entry["message_count"] += 1
                    entry["last_message_from"] = ev.get("role")
                    entry["last_message_at"] = ev.get("timestamp")
                    # Если последнее сообщение от юзера — значит не прочитано
                    entry["has_new_messages"] = (ev.get("role") == "user")
                else:
                    # Логика событий (Claude)
                    action = ev.get("action")
                    if action in ["claude_started", "claude_resumed", "claude_start"]:
                        entry["claude_status"] = "active"
                    elif action == "claude_paused":
                        entry["claude_status"] = "paused"
                    elif action == "claude_stopped":
                        entry["claude_status"] = "stopped"
                    elif action == "messages_marked_read":
                        entry["has_new_messages"] = False
            except: continue

    process_file(CHAT_LOGS_JSONL, is_chat=True)
    process_file(DATA / "crm_history.jsonl", is_chat=False)
    return statuses

@app.get(API_PREFIX + "/crm/users")
def get_crm_users(status: str = None, period: str = "all"):
    """
    Получить пользователей CRM.
    Если status не указан — возвращаем ВСЕХ пользователей (нужно для подсчёта непрочитанных во вкладках).
    """
    try:
        users_data = load_json(USER_DATA_JSON)
        # Получаем карту состояний ОДИН раз
        fast_map = get_fast_dialog_map()
        
        now = datetime.utcnow()
        delta = {"today": 1, "week": 7, "month": 30}.get(period, 9999)
        start_date = now - timedelta(days=delta)

        filtered = []
        for u in users_data:
            # ФИКС АРХИВА: принудительно в строку
            u_id = str(u.get("user_id"))
            u_status = u.get("status")
            # ИСПОЛЬЗУЕМ updated_at для фильтра (чтобы показывать недавних пользователей)
            u_at = u.get("updated_at") or u.get("created_at")
            
            # Фильтр: web_session показываем только если статус pre_booking
            if u_id.startswith("web_session") and u_status != "pre_booking":
                continue
            
            # Остальные - только если user_id числовой
            if not u_id.startswith("web_session"):
                try:
                    int(u_id)
                except ValueError:
                    continue
            
            # Если status указан — фильтруем по нему
            if status and u_status != status:
                continue
            
            if not u_at: continue
            
            u_date = datetime.fromisoformat(u_at.replace('Z', ''))
            
            if u_date >= start_date and not u.get("archived"):
                user_copy = u.copy()
                # Подмешиваем данные из быстрой карты
                if u_id in fast_map:
                    user_copy.update(fast_map[u_id])
                else:
                    user_copy["claude_status"] = "stopped"
                    user_copy["has_new_messages"] = False
                
                filtered.append(user_copy)

        filtered.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return {"status": "ok", "users": filtered}
    except Exception as e:
        print(f"🔴 CRM Users Error: {e}")
        return {"status": "error", "message": str(e), "users": []}
    
@app.get(API_PREFIX + "/crm/stats")
def get_crm_stats(period: str = Query("all")):
    try:
        users_data = load_json(USER_DATA_JSON)
        now = datetime.utcnow()
        
        # Определяем точку отсчета для фильтра
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "2weeks":
            start_date = now - timedelta(days=14)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else: # "all"
            start_date = datetime(2000, 1, 1)

        # Инициализируем счетчики (согласно новой воронке)
        stats = {
            "new": 0,
            "in_work": 0,
            "pre_booking": 0,
            "archive": 0,
            "unread_by_status": {
                "new": 0,
                "in_work": 0,
                "pre_booking": 0
            }
        }
        
        # Собираем user_id последних сообщений от пользователей
        unread_by_user = {}  # user_id -> {has_unread: bool, status: str}
        try:
            cmd = ["tail", "-n", "50000", str(CHAT_LOGS_JSONL)]
            lines = subprocess.check_output(cmd).decode('utf-8').splitlines()
            for line in lines:
                try:
                    ev = json.loads(line.strip())
                    uid = str(ev.get("user_id"))
                    # Запоминаем последний статус для каждого user_id
                    # Если последнее сообщение от user - значит непрочитанное
                    if ev.get("role") == "user":
                        # Ищем статус пользователя в user_data
                        user_record = next((u for u in users_data if str(u.get("user_id")) == uid), None)
                        if user_record:
                            user_status = user_record.get("status")
                            # Маппинг старых статусов
                            if user_status == "in_progress": user_status = "in_work"
                            elif user_status in ["hot", "booked", "pending"]: user_status = "pre_booking"
                            elif user_status == "interested": user_status = "new"
                            
                            if user_status in ["new", "in_work", "pre_booking"]:
                                unread_by_user[uid] = {
                                    "has_unread": True,
                                    "status": user_status
                                }
                except:
                    pass
        except:
            pass
        
        # Считаем непрочитанные по статусам
        for uid, data in unread_by_user.items():
            if data["status"] in stats["unread_by_status"]:
                stats["unread_by_status"][data["status"]] += 1

        for user in users_data:
            # Парсим дату обновления (чтобы показывать только активных пользователей)
            user_date_str = user.get("updated_at") or user.get("created_at") or user.get("timestamp")
            if not user_date_str:
                continue
                
            user_date = datetime.fromisoformat(user_date_str.replace('Z', ''))
            
            # Проверяем, попадает ли юзер в период
            if user_date >= start_date:
                # Если юзер в архиве, считаем его отдельно
                if user.get("archived") is True:
                    stats["archive"] += 1
                else:
                    user_status = user.get("status")
                    
                    # Маппинг на случай, если в базе остались старые статусы
                    if user_status == "in_progress": user_status = "in_work"
                    if user_status in ["hot", "booked", "pending"]: user_status = "pre_booking"
                    if user_status == "interested": user_status = "new"
                    
                    if user_status in stats:
                        stats[user_status] += 1

        return {
            "status": "ok",
            "period": period,
            "stats": stats
        }

    except Exception as e:
        print(f"Stats Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))





@app.post(API_PREFIX + "/crm/log_action")
async def log_user_action(log_request: LogActionRequest):
    """Эндпоинт для логирования действий пользователей"""
    try:
        print(f"[log_action] user_id={log_request.user_id}, action={log_request.action_type}")
        
        # Создаем запись лога
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": log_request.user_id,
            "action_type": log_request.action_type,
            "description": log_request.description,
            "metadata": log_request.metadata or {},
            "performed_by": log_request.performed_by or "system"
        }
        
        # Записываем в файл логов
        log_file = DATA / "user_actions.log"
        
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            print(f"✅ Action logged: {log_request.action_type} for user {log_request.user_id}")
        except Exception as e:
            print(f"⚠️ Не удалось записать в лог: {e}")
            raise HTTPException(status_code=500, detail="Failed to write log")
        
        return {
            "status": "ok",
            "message": "Действие записано в лог",
            "log_entry": log_entry
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in log_user_action: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get(API_PREFIX + "/crm/user_logs/{user_id}")
async def get_user_logs(user_id: int, limit: int = Query(50, ge=1, le=200)):
    """Получить логи действий конкретного пользователя"""
    try:
        logs = []
        log_file = DATA / "user_actions.log"
        
        if log_file.exists():
            with open(log_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        if str(log_entry.get('user_id')) == str(user_id):
                            logs.append(log_entry)
                    except json.JSONDecodeError:
                        continue

        # Сортируем по времени (новые сверху) и ограничиваем количество
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        logs = logs[:limit]
        
        print(f"📊 Found {len(logs)} log entries for user {user_id}")
        
        return {
            "status": "ok",
            "logs": logs,
            "total": len(logs)
        }
        
    except Exception as e:
        print(f"❌ Error in get_user_logs: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


    
@app.get(API_PREFIX + "/crm/archive")
def get_archive_users(period: str = Query("all", alias="period")):
    """Получить список архивных пользователей"""
    try:
        if not ARCHIVE_JSON.exists():
            return {"status": "ok", "users": [], "total": 0}

        with open(ARCHIVE_JSON, "r", encoding="utf-8") as f:
            archive_data = json.load(f)

        # Группируем по user_id (последняя запись)
        latest_user_records = {}
        for event in archive_data:
            uid = event.get("user_id")
            if uid:
                if uid not in latest_user_records or latest_user_records[uid].get("timestamp", "") < event.get("timestamp", ""):
                    latest_user_records[uid] = event
        
        users_data = list(latest_user_records.values())

        # Фильтр по периоду (по archived_at)
        if period != 'all':
            from datetime import timedelta
            now = datetime.utcnow()
            
            if period == 'week':
                cutoff = now - timedelta(days=7)
            elif period == 'month':
                cutoff = now - timedelta(days=30)
            else:
                cutoff = now - timedelta(days=7)
            
            filtered = []
            for user in users_data:
                archived_at = user.get('archived_at', user.get('timestamp', ''))
                try:
                    user_time = datetime.fromisoformat(archived_at.replace('Z', '+00:00'))
                    if user_time >= cutoff:
                        filtered.append(user)
                except:
                    continue
            
            users_data = filtered

        users_data.sort(key=lambda x: x.get('archived_at', x.get('timestamp', '')), reverse=True)

        return {
            "status": "ok",
            "users": users_data,
            "total": len(users_data)
        }
    except Exception as e:
        print(f"❌ Error in get_archive_users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/crm/update_status")
async def update_user_status(update: StatusUpdate):
    """Изменить статус пользователя"""
    try:
        user_id = update.user_id
        new_status = update.status
        note = update.note
        
        print(f"[update_status] user_id={user_id}, status={new_status}, note={note}")
        
        # Получаем текущий статус
        current_user = get_user_latest_record(user_id)
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        old_status = current_user.get('status', 'unknown')

        # Обновляем все записи пользователя
        updates = {
            'status': new_status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if note:
            updates['last_note'] = note
        
        success = update_all_user_records(user_id, updates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user")
        
        # Логируем в историю
        history_file = DATA / "crm_history.jsonl"
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": "status_changed",
            "old_status": old_status,
            "new_status": new_status,
            "note": note,
            "changed_by": ADMIN_ID
        }
        
        try:
            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в историю: {e}")
        
        # ✅ НОВОЕ: Автологирование в user_actions.log
        try:
            action_log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "action_type": "status_changed",
                "description": f"Статус изменен с '{old_status}' на '{new_status}'",
                "metadata": {
                    "old_status": old_status,
                    "new_status": new_status,
                    "note": note
                },
                "performed_by": ADMIN_ID
            }
            
            log_file = DATA / "user_actions.log"
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(action_log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в user_actions.log: {e}")
        
        print(f"✅ Статус обновлен: user {user_id}: {old_status} → {new_status}")
        
        return {
            "status": "ok",
            "message": f"Статус изменен на {new_status}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_user_status: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post(API_PREFIX + "/crm/update_marker")
async def update_user_marker(marker_update: MarkerUpdate):
    """Обновить маркер пользователя"""
    try:
        user_id = marker_update.user_id
        new_marker = marker_update.marker  # None для сброса маркера
        
        print(f"[update_marker] user_id={user_id}, marker={new_marker}")
        
        # Получаем текущий статус пользователя
        current_user = get_user_latest_record(user_id)
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Обновляем маркер пользователя
        updates = {
            'marker': new_marker,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        success = update_all_user_records(user_id, updates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update marker")
        
        # Логируем в историю
        history_file = DATA / "crm_history.jsonl"
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": "marker_updated",
            "marker": new_marker,
            "changed_by": ADMIN_ID
        }
        
        try:
            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в историю: {e}")
        
        # Автологирование в user_actions.log
        try:
            action_log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "action_type": "marker_updated",
                "description": f"Маркер изменен на '{new_marker}'" if new_marker else "Маркер сброшен",
                "metadata": {
                    "marker": new_marker
                },
                "performed_by": ADMIN_ID
            }
            
            log_file = DATA / "user_actions.log"
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(action_log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в user_actions.log: {e}")
        
        marker_text = f"на '{new_marker}'" if new_marker else "сброшен"
        print(f"✅ Маркер обновлен: user {user_id}: {marker_text}")
        
        return {
            "status": "ok",
            "message": f"Маркер изменен {marker_text}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_user_marker: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    



@app.get(API_PREFIX + "/crm/bookings/{user_id}")
def get_user_bookings(user_id: str):
    """Получить список всех бронирований конкретного пользователя"""
    try:
        print(f"🔍 Загружаем бронирования для user_id: {user_id} (тип: {type(user_id)})")
        
        # Загружаем файл с бронированиями
        bookings_data = load_json(BOOKINGS_FILE)
        print(f"📊 Всего бронирований в файле: {len(bookings_data)}")
        
        # Фильтруем брони для конкретного юзера
        # Примечание: приводим к строке, так как в JSON user_id может быть строкой
        user_bookings = [
            b for b in bookings_data
            if str(b.get("user_id")) == str(user_id)
        ]
        
        print(f"🎯 Найдено бронирований для пользователя {user_id}: {len(user_bookings)}")

        # Сортируем: новые брони сверху
        user_bookings.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        return {
            "status": "ok",
            "bookings": user_bookings,
            "total": len(user_bookings)
        }
    except Exception as e:
        print(f"❌ Ошибка получения броней для юзера {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
    
@app.patch(API_PREFIX + "/crm/notes/{note_id}")
async def update_note(note_id: str, data: dict):
    new_text = data.get("text")
    if not new_text:
        raise HTTPException(status_code=400, detail="Text is required")

    history_file = DATA / "crm_history.jsonl"
    lines = []
    found = False
    
    with open(history_file, "r", encoding="utf-8") as f:
        for line in f:
            entry = json.loads(line)
            if entry.get("note_id") == note_id:
                entry["text"] = new_text
                entry["updated_at"] = datetime.utcnow().isoformat()
                line = json.dumps(entry, ensure_ascii=False) + "\n"
                found = True
            lines.append(line)
            
    if found:
        with open(history_file, "w", encoding="utf-8") as f:
            f.writelines(lines)
        return {"status": "ok"}
    
    raise HTTPException(status_code=404, detail="Note not found")  
    
@app.get(API_PREFIX + "/crm/notes/{user_id}")
async def get_user_notes(user_id: int):
    notes = []
    history_file = DATA / "crm_history.jsonl"
    
    if not history_file.exists():
        return {"status": "ok", "notes": []}

    try:
        with open(history_file, "r", encoding="utf-8") as f:
            for line in f:
                entry = json.loads(line)
                if str(entry.get("user_id")) == str(user_id):
                    # Забираем заметки и из обычных добавлений, и из смены статусов
                    if entry.get("note"):
                        notes.append({
                            "timestamp": entry.get("timestamp"),
                            "text": entry.get("note"),
                            "action": entry.get("action")
                        })
        
        # Сортируем: новые сверху
        notes.sort(key=lambda x: x['timestamp'], reverse=True)
        return {"status": "ok", "notes": notes}
    except Exception as e:
        print(f"❌ Ошибка чтения истории: {e}")
        return {"status": "error", "message": str(e)}    
    
    
@app.post(API_PREFIX + "/crm/add_note")
async def add_user_note(note_add: NoteAdd):
    """Добавить заметку к пользователю"""
    try:
        user_id = note_add.user_id
        note = note_add.note
        
        print(f"[add_note] user_id={user_id}, note={note}")
        
        if not note.strip():
            raise HTTPException(status_code=400, detail="Note cannot be empty")
        
        current_user = get_user_latest_record(user_id)
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        updates = {
            'last_note': note,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        success = update_all_user_records(user_id, updates)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add note")
        
        history_file = DATA / "crm_history.jsonl"
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": "note_added",
            "note": note,
            "added_by": ADMIN_ID
        }
        
        try:
            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в историю: {e}")
        
        # ✅ НОВОЕ: Автологирование в user_actions.log
        try:
            action_log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "action_type": "note_added",
                "description": f"Добавлена заметка: {note[:100]}{'...' if len(note) > 100 else ''}",
                "metadata": {
                    "note": note,
                    "note_length": len(note)
                },
                "performed_by": ADMIN_ID
            }
            
            log_file = DATA / "user_actions.log"
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(action_log_entry, ensure_ascii=False) + "\n")
        except Exception as e:
            print(f"⚠️ Не удалось записать в user_actions.log: {e}")
        
        print(f"✅ Заметка добавлена для user {user_id}")
        
        return {
            "status": "ok",
            "message": "Заметка добавлена"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in add_user_note: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get(API_PREFIX + "/crm/user_history/{user_id}")
async def get_user_history(user_id: int):
    """Получить историю изменений пользователя"""
    try:
        history = []
        history_file = DATA / "crm_history.jsonl"
        
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        if str(entry.get('user_id')) == str(user_id):
                            history.append(entry)
                    except json.JSONDecodeError:
                        continue

        history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return {
            "status": "ok",
            "history": history
        }
        
    except Exception as e:
        print(f"❌ Error in get_user_history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(API_PREFIX + "/crm/delete_user/{user_id}")
async def delete_user_record(user_id: str): # Поменял int на str
    success = move_to_archive(user_id)
    if success:
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="User not found")

@app.post(API_PREFIX + "/crm/restore_user/{user_id}")
async def restore_user_record(user_id: str): # Поменял int on str
    success = restore_from_archive(user_id)
    if success:
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="User not found in archive")


@app.post(API_PREFIX + "/crm/auto_archive")
async def trigger_auto_archive():
    """Запустить автоматическую архивацию старых записей"""
    try:
        result = auto_archive_old_records()

        return {
            "status": "ok",
            "archived": result["archived"],
            "message": f"Архивировано записей: {result['archived']}"
        }

    except Exception as e:
        print(f"❌ Error in trigger_auto_archive: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/crm/dedupe")
async def run_dedupe(archive: bool = False):
    """Удалить дубликаты пользователей - оставить только последнюю запись по updated_at"""
    try:
        json_file = ARCHIVE_JSON if archive else USER_DATA_JSON

        if not json_file.exists():
            return {"status": "ok", "removed": 0, "total": 0, "unique": 0}

        with open(json_file, "r", encoding="utf-8") as f:
            users_data = json.load(f)

        original_count = len(users_data)

        # Дедупликация: оставляем только последнюю запись по updated_at
        users_dict = {}
        for record in users_data:
            uid = str(record.get("user_id"))
            ts = record.get("updated_at") or record.get("created_at") or ""
            if uid not in users_dict or ts > (users_dict[uid].get("updated_at") or users_dict[uid].get("created_at") or ""):
                users_dict[uid] = record

        cleaned_data = list(users_dict.values())
        cleaned_data.sort(key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)

        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(cleaned_data, f, indent=2, ensure_ascii=False)

        return {
            "status": "ok",
            "removed": original_count - len(cleaned_data),
            "total": original_count,
            "unique": len(cleaned_data),
            "message": f"Удалено дубликатов: {original_count - len(cleaned_data)}"
        }

    except Exception as e:
        print(f"❌ Error in run_dedupe: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# ОБЪЕДИНЕННАЯ ЛОГИКА CLAUDE
# ==============================
# Унифицированная функция для вызова бота и логирования
async def call_bot_and_log(user_id: int, bot_path: str, event_name: str):
    bot_url = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001").rstrip('/')
    try:
        response = requests.post(f"{bot_url}/botapi/dialog/{bot_path}", json={"user_id": user_id}, timeout=10)
        if response.status_code == 200:
            # Логируем только action и источник. Этого достаточно.
            log_dialog_event(user_id, event_name, source="crm_api")
            return True
        return False
    except Exception as e:
        print(f"❌ Bot connection error: {e}")
        return False

# В web_integration.py

def notify_bot_status_sync(user_id: int, status: str):
    """Отправляет сигнал в процесс бота на порт 5001"""
    try:
        # Убедись, что порт 5001 — это порт твоего бота
        bot_url = "http://127.0.0.1:5001/internal/update_claude_status"
        requests.post(bot_url, json={
            "user_id": user_id,
            "status": status
        }, timeout=2)
    except Exception as e:
        print(f"⚠️ Не удалось синхронизировать статус с ботом: {e}")

# Claude endpoints that match frontend expectations
@app.post("/api/claude/start/{user_id}")
async def api_start_claude(user_id: int):
    """Start Claude for a specific user"""
    try:
        print(f"🤖 Starting Claude for user {user_id}")
        
        # 1. Сообщаем боту, чтобы он включил хэндлер Клода
        notify_bot_status_sync(user_id, "active")
        
        # 2. Записываем событие (для красоты в CRM)
        log_dialog_event(user_id, "claude_started", {"by": "manager"})
        
        # 3. Запускаем квалификацию
        threading.Thread(target=handle_claude_best_options, args=(user_id,)).start()
        
        return {"status": "success", "message": f"Claude started for user {user_id}"}
    except Exception as e:
        print(f"❌ Error starting Claude for user {user_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/claude/stop/{user_id}")
async def api_stop_claude(user_id: int):
    """Stop Claude for a specific user"""
    try:
        print(f"⏹️ Stopping Claude for user {user_id}")
        
        # Сообщаем боту выключить Клода
        notify_bot_status_sync(user_id, "idle")
        log_dialog_event(user_id, "claude_stopped", {"by": "manager"})
        
        return {"status": "success", "message": f"Claude stopped for user {user_id}"}
    except Exception as e:
        print(f"❌ Error stopping Claude for user {user_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/claude/pause/{user_id}")
async def api_pause_claude(user_id: int):
    """Pause Claude for a specific user"""
    try:
        print(f"⏸️ Pausing Claude for user {user_id}")
        
        notify_bot_status_sync(user_id, "paused")
        log_dialog_event(user_id, "claude_paused", {"by": "manager"})
        
        return {"status": "success", "message": f"Claude paused for user {user_id}"}
    except Exception as e:
        print(f"❌ Error pausing Claude for user {user_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/claude/resume/{user_id}")
async def api_resume_claude(user_id: int):
    """Resume Claude for a specific user"""
    try:
        print(f"▶️ Resuming Claude for user {user_id}")
        
        notify_bot_status_sync(user_id, "active")
        log_dialog_event(user_id, "claude_resumed", {"by": "manager"})
        
        return {"status": "success", "message": f"Claude resumed for user {user_id}"}
    except Exception as e:
        print(f"❌ Error resuming Claude for user {user_id}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/claude/send_message")
async def api_send_claude_message(request: Request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        message = data.get('message')
        
        if not user_id or not message:
            raise HTTPException(status_code=400, detail="user_id and message required")
        
        # ✅ ВОССТАНАВЛИВАЕМ ДИАЛОГ, НО НЕ ЗАТИРАЕМ ФИЛЬТРЫ
        if user_id not in user_conversations:
            # Тут в идеале нужно подгрузить фильтры из основной БД пользователей
            existing_filters = get_user_filters_from_db(user_id)
            user_conversations[user_id] = {
                "status": "active",
                "history": [], # историю Claude подтянет сам из файлов если нужно
                "filters": existing_filters
            }
        
        # Принудительно ставим статус active, раз мы шлем сообщение
        user_conversations[user_id]["status"] = "active"
        
        result = process_claude_message(user_id, message)
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in api_send_claude_message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_user_filters_from_db(user_id: int) -> dict:
    """
    Получает фильтры пользователя из базы данных user_data.json
    Возвращает словарь с фильтрами для Claude
    """
    try:
        # Читаем данные пользователей
        users_data = load_json(USER_DATA_JSON)

        # Ищем пользователя по user_id
        user_data = next((u for u in users_data if str(u.get('user_id')) == str(user_id)), None)
        
        if user_data:
            # Извлекаем фильтры из данных пользователя
            filters = {
                "category": user_data.get("category_interested", "все"),
                "start_date": user_data.get("dates_selected", {}).get("start", ""),
                "end_date": user_data.get("dates_selected", {}).get("end", ""),
                "days": user_data.get("days_count", 7),
                "car_interested": user_data.get("car_interested", ""),
                "status": user_data.get("status", "new")
            }
            print(f"✅ Loaded filters for user {user_id}: {filters}")
            return filters
        else:
            # Если пользователь не найден, возвращаем пустые фильтры
            print(f"⚠️ User {user_id} not found in database, returning empty filters")
            return {
                "category": "все",
                "start_date": "",
                "end_date": "",
                "days": 7,
                "car_interested": "",
                "status": "new"
            }
            
    except Exception as e:
        print(f"❌ Error loading user filters from database: {e}")
        # В случае ошибки возвращаем базовые фильтры
        return {
            "category": "все",
            "start_date": "",
            "end_date": "",
            "days": 7,
            "car_interested": "",
            "status": "new"
        }

@app.get("/api/claude/status/{user_id}")
async def api_get_claude_status(user_id: int):
    """Получает статус, вычисленный из ЛОГОВ (Source of Truth)"""
    try:
        # Теперь мы не верим только памяти, а смотрим в историю
        computed_data = get_dialog_status_from_history(user_id)
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                "user_id": user_id,
                "claude_status": computed_data["claude_status"],
                "last_message_from": computed_data["last_message_from"],
                "message_count": computed_data["message_count"]
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
@app.post("/api/claude/best_options")
async def api_get_claude_best_options(request: Request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # ✅ СОЗДАЕМ ДИАЛОГ ЕСЛИ ЕГО НЕТ (для синхронизации с ботом)
        if user_id not in user_conversations:
            print(f"🔄 Creating conversation for user {user_id} in backend memory")
            user_conversations[user_id] = {
                "status": "active",
                "history": [],
                "filters": {}
            }
            if user_id not in user_sessions:
                user_sessions[user_id] = {}
            user_sessions[user_id]["claude_initiated"] = True
        
        result = handle_claude_best_options(user_id)
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in api_get_claude_best_options: {e}")
        raise HTTPException(status_code=500, detail=str(e))
"""

def sync_user_context(user_id):
    """Подгружает актуальные фильтры из основной базы пользователей в память Клода"""
    if user_id not in user_conversations:
        # Пытаемся найти юзера в users.json
        try:
            with open(USER_DATA_JSON, 'r', encoding='utf-8') as f:
                users = json.load(f)
                user_data = next((u for u in users if str(u.get('user_id')) == str(user_id)), None)

                if user_data:
                    # Переносим данные из БД в 'слой' фильтров для Клода
                    filters = {
                        "category": user_data.get("category_interested", "все"),
                        "start_date": user_data.get("dates_selected", {}).get("start", ""),
                        "end_date": user_data.get("dates_selected", {}).get("end", ""),
                        "days": user_data.get("days_count", 7)
                    }
                    user_conversations[user_id] = {
                        "status": "active",
                        "history": [],
                        "filters": filters
                    }
                    print(f"✅ Context restored for {user_id}: {filters}")
                else:
                    # Если юзера нет в базе, создаем пустой скелет
                    user_conversations[user_id] = {"status": "active", "history": [], "filters": {}}
        except Exception as e:
            print(f"⚠️ Error restoring context: {e}")
            user_conversations[user_id] = {"status": "active", "history": [], "filters": {}}

@app.post(API_PREFIX + "/crm/claude/best_options")
async def api_get_claude_best_options(request: Request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id required")
        
        # 1. Синхронизируем контекст (фильтры), чтобы Клод видел даты
        sync_user_context(user_id)
        
        # 2. Убеждаемся, что статус в памяти - active
        user_conversations[user_id]["status"] = "active"
        
        # 3. ЗАПИСЫВАЕМ СОБЫТИЕ В ЛОГ (Event Sourcing)
        # Именно отсюда функция get_computed_dialog_data поймет, что AI ON
        log_dialog_event(user_id, "claude_start", {
            "action_type": "best_options_click",
            "timestamp": datetime.now().isoformat()
        })

        # 4. Запускаем генерацию и отправку сообщения в Telegram
        # Важно: это должно происходить асинхронно или через Thread, чтобы не вешать CRM
        result = handle_claude_best_options(user_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error in api_get_claude_best_options: {e}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/claude/active_dialogs")
async def api_get_active_dialogs():
    """Список активных диалогов на основе вычислений"""
    try:
        # Для этого эндпоинта придется пробежаться по всем юзерам 
        # и вычислить их статусы. Это гарантирует точность.
        users = load_all_users() # загружаем список ID
        active_dialogs = []
        
        for u_id in users:
            status_info = get_dialog_status_from_history(u_id)
            if status_info["claude_status"] == "active":
                active_dialogs.append({
                    "user_id": u_id,
                    "status": "active",
                    "message_count": status_info["message_count"]
                })
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                "active_dialogs": active_dialogs,
                "total_active": len(active_dialogs)
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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


@app.post("/api/internal/receive-message")
async def receive_message_from_bot(request: Request):
    """Receive message from Telegram bot and log it"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        text = data.get('text')
        username = data.get('username')
        timestamp = data.get('timestamp')
        media = data.get('media')  # Новое поле для медиа
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        print(f"📨 Received message from bot: user {user_id}, text: {text[:50] if text else 'No text'}...")
        
        # 1. Log message to chat history with role "user"
        try:
            chat_log_entry = {
                "timestamp": timestamp or datetime.utcnow().isoformat(),
                "user_id": user_id,
                "role": "user",
                "text": text or "[Медиасообщение]",
                "username": username,
                "source": "telegram_bot"
            }
            
            # Добавляем информацию о медиа если есть
            if media:
                chat_log_entry["media"] = media
            
            with open(CHAT_LOGS_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps(chat_log_entry, ensure_ascii=False) + "\n")
            print(f"✅ Message logged to chat history for user {user_id}")
        except Exception as log_error:
            print(f"⚠️ Failed to log message to chat history: {log_error}")
        
        # Логируем событие диалога
        log_dialog_event(user_id, "user_message_received", {
            "message_length": len(text) if text else 0,
            "message_type": "media" if media else "text",
            "username": username,
            "media_info": media
        })
        
        # 2. Update user metadata (last message time) to move them up in CRM chat list
        try:
            users_data = load_json(USER_DATA_JSON)
            user_updated = False

            for user in users_data:
                if str(user.get('user_id')) == str(user_id):
                    user['last_message_at'] = datetime.utcnow().isoformat()
                    user['updated_at'] = datetime.utcnow().isoformat()
                    user_updated = True
                    break

            if user_updated:
                # Дедупликация: удаляем ВСЕ записи с этим user_id перед сохранением
                users_data = [u for u in users_data if str(u.get("user_id")) != str(user_id)]
                users_data.append(user)
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

@app.post("/api/internal/receive-media")
async def receive_media_from_bot(request: Request):
    """Receive media from Telegram bot and log it"""
    try:
        data = await request.json()
        user_id = data.get('user_id')
        media_info = data.get('media')
        username = data.get('username')
        timestamp = data.get('timestamp')
        
        if not user_id or not media_info:
            raise HTTPException(status_code=400, detail="user_id and media are required")
        
        print(f"📸 Received media from bot: user {user_id}, type: {media_info.get('type')}")
        
        # Log media message to chat history
        try:
            chat_log_entry = {
                "timestamp": timestamp or datetime.utcnow().isoformat(),
                "user_id": user_id,
                "role": "user",
                "text": f"[{media_info.get('type', 'media').capitalize()}]",
                "username": username,
                "source": "telegram_bot",
                "media": media_info
            }
            
            with open(CHAT_LOGS_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps(chat_log_entry, ensure_ascii=False) + "\n")
            print(f"✅ Media logged to chat history for user {user_id}")
        except Exception as log_error:
            print(f"⚠️ Failed to log media to chat history: {log_error}")
        
        # Логируем событие диалога
        log_dialog_event(user_id, "user_media_received", {
            "media_type": media_info.get('type'),
            "file_size": media_info.get('file_size'),
            "filename": media_info.get('filename') or media_info.get('file_name'),
            "username": username
        })
        
        # Update user metadata
        try:
            users_data = load_json(USER_DATA_JSON)
            user_updated = False

            for user in users_data:
                if str(user.get('user_id')) == str(user_id):
                    user['last_message_at'] = datetime.utcnow().isoformat()
                    user['updated_at'] = datetime.utcnow().isoformat()
                    user_updated = True
                    break

            if user_updated:
                # Дедупликация: удаляем ВСЕ записи с этим user_id перед сохранением
                users_data = [u for u in users_data if str(u.get("user_id")) != str(user_id)]
                users_data.append(user)
                save_json(USER_DATA_JSON, users_data)
                print(f"✅ Updated metadata for user {user_id}")
            else:
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
            "message": "Media received and logged successfully"
        }
        
    except Exception as e:
        print(f"❌ Error in receive_media_from_bot: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==============================
# CAR OWNERS API
# ==============================

@app.get(API_PREFIX + "/car-owners")
def get_car_owners():
    """Получить список всех владельцев авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})
        return {
            "status": "ok",
            "owners": list(owners.values()),
            "count": len(owners)
        }
    except Exception as e:
        print(f"❌ Error in get_car_owners: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(API_PREFIX + "/car-owners-map")
def get_car_owners_map():
    """Получить маппинг car_id -> owner_id (для фронта)"""
    data = load_json(CAR_OWNERS_JSON)
    owners = data.get("owners", {})
    car_to_owner = {}
    for owner in owners.values():
        owner_id = owner.get("id")
        for car_id in owner.get("car_ids", {}):
            car_to_owner[car_id] = owner_id
    return car_to_owner

@app.get(API_PREFIX + "/fleet")
def get_fleet():
    """Получить данные о флоте автомобилей"""
    try:
        data = load_json(CARS_JSON)
        cars = data.get("cars", {})
        
        # Filter available cars only
        available_cars = {}
        for car_id, car_data in cars.items():
            if car_data.get("available", True):  # Default to true if not specified
                available_cars[car_id] = car_data
        
        return {
            "status": "ok",
            "vehicles": available_cars,
            "count": len(available_cars)
        }
    except Exception as e:
        print(f"❌ Error in get_fleet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(API_PREFIX + "/admin/car-owners")
def create_car_owner(owner: CreateCarOwner):
    """Создать нового владельца авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})

        # Проверить, существует ли уже владелец с таким ID
        if owner.id in owners:
            raise HTTPException(status_code=400, detail=f"Owner with ID '{owner.id}' already exists")

        # Создать нового владельца
        new_owner = {
            "id": owner.id,
            "name": owner.name,
            "contact": owner.contact,
            "facebook_url": owner.facebook_url,
            "car_ids": {},
            "updated_at": datetime.utcnow().isoformat()
        }

        owners[owner.id] = new_owner
        data["owners"] = owners

        # Сохранить в файл
        with _lock:
            save_json(CAR_OWNERS_JSON, data)

        print(f"✅ Created new car owner: {owner.id}")
        return new_owner
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in create_car_owner: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put(API_PREFIX + "/admin/car-owners/{owner_id}")
def update_car_owner(owner_id: str, owner_data: dict):
    """Обновить данные владельца авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})

        # Проверить, существует ли владелец
        if owner_id not in owners:
            raise HTTPException(status_code=404, detail=f"Owner with ID '{owner_id}' not found")

        # Обновить данные владельца
        owner = owners[owner_id]
        
        if "name" in owner_data:
            owner["name"] = owner_data["name"]
        if "contact" in owner_data:
            owner["contact"] = owner_data["contact"]
        if "facebook_url" in owner_data:
            owner["facebook_url"] = owner_data["facebook_url"]
        
        owner["updated_at"] = datetime.utcnow().isoformat()
        
        data["owners"] = owners

        # Сохранить в файл
        with _lock:
            save_json(CAR_OWNERS_JSON, data)

        print(f"✅ Updated car owner: {owner_id}")
        return {
            "status": "ok",
            "owner": owner,
            "message": "Owner updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_car_owner: {e}")
        raise HTTPException(status_code=500, detail=str(e))   


@app.get(API_PREFIX + "/car-owners/{owner_id}")
def get_car_owner(owner_id: str):
    """Получить информацию о конкретном владельце со всеми его авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})
        if owner_id not in owners:
            raise HTTPException(status_code=404, detail="Owner not found")
        return {
            "status": "ok",
            "owner": owners[owner_id]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_car_owner: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(API_PREFIX + "/car-owners/{owner_id}/car/{car_id}")
def get_car_owner_info(owner_id: str, car_id: str):
    """Получить информацию владельца и конкретного авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})
        if owner_id not in owners:
            raise HTTPException(status_code=404, detail="Owner not found")

        owner = owners[owner_id]
        car_info = owner.get("car_ids", {}).get(car_id)

        if not car_info:
            raise HTTPException(status_code=404, detail="Car not found for this owner")

        return {
            "status": "ok",
            "owner": {
                "id": owner["id"],
                "name": owner["name"],
                "contact": owner["contact"],
                "facebook_url": owner["facebook_url"]
            },
            "car": {
                "car_id": car_id,
                "notes": car_info.get("notes", []),
                "status": car_info.get("status", "available"),
                "available_until": car_info.get("available_until"),
                "updated_at": car_info.get("updated_at")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_car_owner_info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(API_PREFIX + "/car-owners/{owner_id}/car/{car_id}/note")
async def add_car_note(owner_id: str, car_id: str, note: str = Query(...)):
    """Добавить пометку к конкретному авто владельца"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})

        if owner_id not in owners:
            raise HTTPException(status_code=404, detail="Owner not found")

        owner = owners[owner_id]
        if car_id not in owner.get("car_ids", {}):
            raise HTTPException(status_code=404, detail="Car not found for this owner")

        if "notes" not in owner["car_ids"][car_id]:
            owner["car_ids"][car_id]["notes"] = []

        owner["car_ids"][car_id]["notes"].append(note)
        owner["car_ids"][car_id]["updated_at"] = datetime.utcnow().isoformat()

        with _lock:
            save_json(CAR_OWNERS_JSON, data)

        return {
            "status": "ok",
            "message": "Note added successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in add_car_note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put(API_PREFIX + "/car-owners/{owner_id}/car/{car_id}")
async def update_car_availability(owner_id: str, car_id: str, status: str = Query(...),
                                  available_until: Optional[str] = Query(None)):
    """Обновить статус доступности авто"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})

        if owner_id not in owners:
            raise HTTPException(status_code=404, detail="Owner not found")

        owner = owners[owner_id]
        if car_id not in owner.get("car_ids", {}):
            raise HTTPException(status_code=404, detail="Car not found for this owner")

        owner["car_ids"][car_id]["status"] = status
        if available_until:
            owner["car_ids"][car_id]["available_until"] = available_until
        owner["car_ids"][car_id]["updated_at"] = datetime.utcnow().isoformat()

        with _lock:
            save_json(CAR_OWNERS_JSON, data)

        return {
            "status": "ok",
            "message": "Car availability updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_car_availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put(API_PREFIX + "/admin/cars/{car_id}/owner-info")
async def update_car_owner_info(car_id: str, owner_info: CarOwnerInfo):
    """Обновить информацию о владельце автомобиля: ID владельца, Facebook URL, дату освобождения, пометки, статус"""
    try:
        data = load_json(CAR_OWNERS_JSON)
        owners = data.get("owners", {})
        
        # Если указан owner_id, найти владельца и связать автомобиль с ним
        if owner_info.owner_id:
            # Сначала проверить, не связан ли этот автомобиль с другим владельцем
            for owner_id, owner in owners.items():
                if car_id in owner.get("car_ids", {}):
                    # Удалить автомобиль из предыдущего владельца
                    del owner["car_ids"][car_id]
                    owner["updated_at"] = datetime.utcnow().isoformat()
            
            # Добавить автомобиль к новому владельцу
            if owner_info.owner_id not in owners:
                raise HTTPException(status_code=404, detail=f"Owner with ID '{owner_info.owner_id}' not found")
            
            new_owner = owners[owner_info.owner_id]
            if car_id not in new_owner.get("car_ids", {}):
                new_owner["car_ids"][car_id] = {
                    "notes": [],
                    "status": "available",
                    "available_until": None,
                    "facebook_url": None,
                    "updated_at": datetime.utcnow().isoformat()
                }
        
        # Найти владельца текущего автомобиля для обновления его данных
        current_owner = None
        current_owner_id = None
        for owner_id, owner in owners.items():
            if car_id in owner.get("car_ids", {}):
                current_owner = owner
                current_owner_id = owner_id
                break
        
        if not current_owner:
            raise HTTPException(status_code=404, detail=f"Car '{car_id}' not found in any owner's inventory")
        
        car_data = current_owner["car_ids"][car_id]
        
        # Обновить статус если указан
        if owner_info.status is not None:
            car_data["status"] = owner_info.status
        
        # Обновить Facebook URL если указан
        if owner_info.facebook_url is not None:
            car_data["facebook_url"] = owner_info.facebook_url
        
        # Обновить дату если указана
        if owner_info.available_until is not None:
            car_data["available_until"] = owner_info.available_until
        
        # Обновить пометки если указаны
        if owner_info.notes is not None:
            car_data["notes"] = owner_info.notes
        
        car_data["updated_at"] = datetime.utcnow().isoformat()
        current_owner["updated_at"] = datetime.utcnow().isoformat()
        
        with _lock:
            save_json(CAR_OWNERS_JSON, data)
        
        return {
            "status": "ok",
            "message": "Car owner info updated successfully",
            "car_id": car_id,
            "owner_id": current_owner_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_car_owner_info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
# ==============================
# BOOKINGS SCHEDULE CRUD API
# ==============================

@app.get(API_PREFIX + "/bookings/{booking_id}")
def api_get_booking(booking_id: str):
    bookings = load_bookings()
    for b in bookings:
        if b.get("booking_id") == booking_id:
            return {"status": "ok", "booking": b}
    raise HTTPException(404, "Booking not found")

@app.get("/bookings")
def list_bookings():
    return load_json(BOOKINGS_FILE)

@app.post(API_PREFIX + "/admin/bookings")
async def admin_create_booking(booking_data: AdminBookingRequest):
    """Создание/обновление брони напрямую из админ-панели"""
    try:
        print("=== START admin_create_booking ===")
        print(f"Successfully parsed request data: {booking_data}")
        
        form_data = booking_data.form_data
        print(f"Form data parsed successfully: {form_data}")
        
        booking_id = booking_data.booking_id
        
        if not form_data:
            print("ERROR: form_data is missing")
            raise HTTPException(status_code=400, detail="form_data is missing")
        
        # ✅ НОВАЯ ПРОВЕРКА: Проверяем пересечение дат
        car_id = form_data.car.id
        start_date = form_data.dates.start
        end_date = form_data.dates.end
        
        overlap_check = check_booking_overlap(
            car_id=car_id,
            start_date=start_date,
            end_date=end_date,
            exclude_booking_id=booking_id  # При редактировании исключаем текущую бронь
        )
        
        if not overlap_check["available"]:
            conflicts = overlap_check["conflicting_bookings"]
            # ✅ Красивое сообщение
            conflict_messages = []
            for c in conflicts:
                conflict_messages.append(
                    f"• {c['customer_name']}: {c['start']} - {c['end']}"
                )
            
            conflict_info = "\n".join(conflict_messages)  # ✅ Добавлены отступы
            raise HTTPException(                           # ✅ Добавлены отступы
                status_code=409,
                detail=f"Машина уже забронирована на эти даты:\n{conflict_info}"
            )
        
        # Конвертируем Pydantic в dict
        form_data_dict = form_data.model_dump() if hasattr(form_data, 'model_dump') else form_data.dict()
        
        bookings = load_bookings()
        
        if booking_id:
            # Редактирование
            print(f"Updating existing booking: {booking_id}")
            found = False
            for booking in bookings:
                if booking.get('booking_id') == booking_id:
                    booking['form_data'] = form_data_dict
                    booking['updated_at'] = datetime.utcnow().isoformat()
                    found = True
                    print(f"✓ Updated booking {booking_id}")
                    break
            
            if not found:
                print(f"ERROR: Booking {booking_id} not found")
                raise HTTPException(status_code=404, detail="Booking not found")
        else:
            # Создание
            booking_id = str(uuid.uuid4())[:8]
            print(f"Creating new booking: {booking_id}")
            
            bookings.append({
                "booking_id": booking_id,
                "user_id": "admin",
                "form_data": form_data_dict,
                "status": "pre_booking",  # ✅ ВСЕ брони начинаются как предварительные
                "created_at": datetime.utcnow().isoformat(),
                "source": "admin_panel"
            })
            print(f"✓ Created pre_booking {booking_id}")
        
        # Сохраняем
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
        print("✓ Bookings saved to JSON")
        
        print("=== SUCCESS ===")
        return {
            "status": "ok",
            "booking_id": booking_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! FATAL ERROR in admin_create_booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/bookings/web-create")
async def web_create_booking(booking_data: AdminBookingRequest):
    """Создание брони с веб-интерфейса (предварительная бронь)"""
    try:
        print("=== START web_create_booking ===")
        print(f"Successfully parsed request data: {booking_data}")
        
        form_data = booking_data.form_data
        print(f"Form data parsed successfully: {form_data}")
        
        booking_id = booking_data.booking_id
        
        if not form_data:
            print("ERROR: form_data is missing")
            raise HTTPException(status_code=400, detail="form_data is missing")
        
        # ✅ НОВАЯ ПРОВЕРКА: Проверяем пересечение дат
        car_id = form_data.car.id
        start_date = form_data.dates.start
        end_date = form_data.dates.end
        
        overlap_check = check_booking_overlap(
            car_id=car_id,
            start_date=start_date,
            end_date=end_date,
            exclude_booking_id=booking_id  # При редактировании исключаем текущую бронь
        )
        
        if not overlap_check["available"]:
            conflicts = overlap_check["conflicting_bookings"]
            # ✅ Красивое сообщение
            conflict_messages = []
            for c in conflicts:
                conflict_messages.append(
                    f"• {c['customer_name']}: {c['start']} - {c['end']}"
                )
            
            conflict_info = "\n".join(conflict_messages)  # ✅ Добавлены отступы
            raise HTTPException(                           # ✅ Добавлены отступы
                status_code=409,
                detail=f"Машина уже забронирована на эти даты:\n{conflict_info}"
            )
        
        # Конвертируем Pydantic в dict
        form_data_dict = form_data.model_dump() if hasattr(form_data, 'model_dump') else form_data.dict()
        
        bookings = load_bookings()
        
        if booking_id:
            # Редактирование
            print(f"Updating existing booking: {booking_id}")
            found = False
            for booking in bookings:
                if booking.get('booking_id') == booking_id:
                    booking['form_data'] = form_data_dict
                    booking['updated_at'] = datetime.utcnow().isoformat()
                    found = True
                    print(f"✓ Updated booking {booking_id}")
                    break
            
            if not found:
                print(f"ERROR: Booking {booking_id} not found")
                raise HTTPException(status_code=404, detail="Booking not found")
        else:
            # Создание
            booking_id = str(uuid.uuid4())[:8]
            print(f"Creating new booking: {booking_id}")
            
            # Используем user_id из запроса или fallback
            user_id = booking_data.user_id if booking_data.user_id else "web_user"
            
            bookings.append({
                "booking_id": booking_id,
                "user_id": str(user_id),
                "form_data": form_data_dict,
                "status": "pre_booking",
                "created_at": datetime.utcnow().isoformat(),
                "source": "web_frontend"
            })
            print(f"✓ Created pre_booking {booking_id} for user {user_id}")
        
        # Сохраняем
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
        print("✓ Bookings saved to JSON")
        
        # ✅ Уведомляем Telegram бота о новой предварительной брони
        try:
            # Получаем username из user_data.json
            users_data = load_json(USER_DATA_JSON)
            user_record = next((u for u in users_data if str(u.get("user_id")) == str(user_id)), None)
            display_name = user_record.get("username") if user_record else None
            if not display_name:
                display_name = booking_data.form_data.contact.name if booking_data.form_data.contact.name else str(user_id)
            
            notify_telegram_bot_about_booking(
                booking_id=booking_id,
                user_id=user_id,
                form_data=form_data_dict,
                username=display_name
            )
        except Exception as e:
            print(f"Warning: Failed to notify bot about booking: {e}")
        
        print("=== SUCCESS ===")
        return {
            "status": "ok",
            "booking_id": booking_id,
            "message": "Предварительная бронь создана успешно"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! FATAL ERROR in web_create_booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/bookings/telegram_webapp")
async def telegram_webapp_create_booking(booking_data: AdminBookingRequest):
    """Создание брони из Telegram WebApp (предварительная бронь)"""
    try:
        print("=== START telegram_webapp_create_booking ===")
        print(f"Successfully parsed request data: {booking_data}")
        
        form_data = booking_data.form_data
        print(f"Form data parsed successfully: {form_data}")
        
        booking_id = booking_data.booking_id
        
        if not form_data:
            print("ERROR: form_data is missing")
            raise HTTPException(status_code=400, detail="form_data is missing")
        
        # ✅ НОВАЯ ПРОВЕРКА: Проверяем пересечение дат
        car_id = form_data.car.id
        start_date = form_data.dates.start
        end_date = form_data.dates.end
        
        overlap_check = check_booking_overlap(
            car_id=car_id,
            start_date=start_date,
            end_date=end_date,
            exclude_booking_id=booking_id  # При редактировании исключаем текущую бронь
        )
        
        if not overlap_check["available"]:
            conflicts = overlap_check["conflicting_bookings"]
            # ✅ Красивое сообщение
            conflict_messages = []
            for c in conflicts:
                conflict_messages.append(
                    f"• {c['customer_name']}: {c['start']} - {c['end']}"
                )
            
            conflict_info = "\n".join(conflict_messages)  # ✅ Добавлены отступы
            raise HTTPException(                           # ✅ Добавлены отступы
                status_code=409,
                detail=f"Машина уже забронирована на эти даты:\n{conflict_info}"
            )
        
        # Конвертируем Pydantic в dict
        form_data_dict = form_data.model_dump() if hasattr(form_data, 'model_dump') else form_data.dict()
        
        bookings = load_bookings()
        
        if booking_id:
            # Редактирование
            print(f"Updating existing booking: {booking_id}")
            found = False
            for booking in bookings:
                if booking.get('booking_id') == booking_id:
                    booking['form_data'] = form_data_dict
                    booking['updated_at'] = datetime.utcnow().isoformat()
                    found = True
                    print(f"✓ Updated booking {booking_id}")
                    break
            
            if not found:
                print(f"ERROR: Booking {booking_id} not found")
                raise HTTPException(status_code=404, detail="Booking not found")
        else:
            # Создание
            booking_id = str(uuid.uuid4())[:8]
            print(f"Creating new booking: {booking_id}")
            
            # Используем user_id из запроса или fallback
            user_id = booking_data.user_id if booking_data.user_id else "telegram_user"
            
            bookings.append({
                "booking_id": booking_id,
                "user_id": str(user_id),  # ✅ Сохраняем реальный user_id
                "form_data": form_data_dict,
                "status": "pre_booking",
                "created_at": datetime.utcnow().isoformat(),
                "source": "telegram_webapp"
            })
            print(f"✓ Created pre_booking {booking_id} for user {user_id}")
        
        # Сохраняем
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
        print("✓ Bookings saved to JSON")
        
        # ✅ Уведомляем Telegram бота о новой предварительной брони
        try:
            # Получаем username из user_data.json
            users_data = load_json(USER_DATA_JSON)
            user_record = next((u for u in users_data if str(u.get("user_id")) == str(user_id)), None)
            display_name = user_record.get("username") if user_record else None
            if not display_name:
                display_name = booking_data.form_data.contact.name if booking_data.form_data.contact.name else str(user_id)
            
            notify_telegram_bot_about_booking(
                booking_id=booking_id,
                user_id=user_id,
                form_data=form_data_dict,
                username=display_name
            )
        except Exception as e:
            print(f"Warning: Failed to notify bot about booking: {e}")
        
        print("=== SUCCESS ===")
        return {
            "status": "ok",
            "booking_id": booking_id,
            "message": "Предварительная бронь создана успешно"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! FATAL ERROR in telegram_webapp_create_booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/admin/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str):
    """Подтвердить предварительную бронь (convert pre_booking to confirmed)"""
    try:
        print(f"=== START confirm_booking for {booking_id} ===")
        
        bookings = load_bookings()
        
        # Находим бронь
        booking_found = False
        for booking in bookings:
            if booking.get('booking_id') == booking_id:
                if booking.get('status') != 'pre_booking':
                    raise HTTPException(
                        status_code=400,
                        detail=f"Бронь {booking_id} уже подтверждена или имеет статус {booking.get('status')}"
                    )
                
                # Подтверждаем бронь
                booking['status'] = 'confirmed'
                booking['confirmed_at'] = datetime.utcnow().isoformat()
                booking['updated_at'] = datetime.utcnow().isoformat()
                booking_found = True
                
                print(f"✓ Подтверждена бронь {booking_id}")
                break
        
        if not booking_found:
            raise HTTPException(status_code=404, detail=f"Бронь {booking_id} не найдена")
        
        # Сохраняем
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
        print("✓ Bookings saved to JSON")
        
        print("=== SUCCESS ===")
        return {
            "status": "ok",
            "booking_id": booking_id,
            "message": "Бронь успешно подтверждена"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! FATAL ERROR in confirm_booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post(API_PREFIX + "/admin/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, data: dict = None):
    """Отклонить бронь и архивировать лида"""
    try:
        print(f"=== START reject_booking for {booking_id} ===")
        
        bookings = load_bookings()
        users_data = load_json(USER_DATA_JSON)
        
        # Находим бронь
        booking_found = False
        user_id = None
        for booking in bookings:
            if booking.get('booking_id') == booking_id:
                if booking.get('status') not in ['pre_booking', 'new']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Бронь {booking_id} имеет статус {booking.get('status')}, нельзя отклонить"
                    )
                
                # Отклоняем бронь
                booking['status'] = 'rejected'
                booking['rejected_at'] = datetime.utcnow().isoformat()
                booking['updated_at'] = datetime.utcnow().isoformat()
                user_id = booking.get('user_id')
                booking_found = True
                
                print(f"✓ Отклонена бронь {booking_id} для пользователя {user_id}")
                break
        
        if not booking_found:
            raise HTTPException(status_code=404, detail=f"Бронь {booking_id} не найдена")
        
        # Архивируем лида (user status = archived)
        if user_id:
            for user in users_data:
                if str(user.get('user_id')) == str(user_id):
                    user['status'] = 'archive'
                    user['archived_at'] = datetime.utcnow().isoformat()
                    user['updated_at'] = datetime.utcnow().isoformat()
                    print(f"✓ Архивирован лид {user_id}")
                    break
        
        # Сохраняем
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
            save_json(USER_DATA_JSON, users_data)
        print("✓ Bookings and users saved to JSON")
        
        return {
            "status": "ok",
            "booking_id": booking_id,
            "message": "Бронь отклонена, лид архивирован"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! FATAL ERROR in reject_booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete(API_PREFIX + "/admin/bookings/{booking_id}")
async def admin_delete_booking(booking_id: str):
    """Удаление брони из админ-панели"""
    try:
        print(f"=== DELETE booking {booking_id} ===")
        
        bookings = load_bookings()
        initial_count = len(bookings)
        
        bookings = [b for b in bookings if b.get('booking_id') != booking_id]
        
        if len(bookings) == initial_count:
            print(f"ERROR: Booking {booking_id} not found")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        with _lock:
            save_json(BOOKINGS_FILE, bookings)
        print(f"✓ Deleted booking {booking_id}")
        
        return {"status": "ok"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"!!! ERROR deleting booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

# ==============================
# АДМИНКА CRUD (ФЛОТ-ПАНЕЛЬ)
# ==============================

@app.get(API_PREFIX + "/admin/cars")
def admin_get_cars():
    data = load_json(CARS_JSON)
    return data

@app.get(API_PREFIX + "/admin/cars/{car_id}")
def admin_get_single_car(car_id: str):
    data = load_json(CARS_JSON)
    if car_id not in data.get("cars", {}):
        raise HTTPException(404, "Car not found")
    car = data["cars"][car_id]
    if "photos" not in car or car["photos"] is None:
        car["photos"] = {"main": "", "gallery": []}
    return car

@app.post(API_PREFIX + "/admin/cars", status_code=201)
def admin_create_car(car: Car):
    data = load_json(CARS_JSON)
    if car.id in data.get("cars", {}):
        raise HTTPException(400, "Car ID exists")
    car_model_key = car.model.lower() if car.model else ""
    if car_model_key in model_specs:
        car.specs = model_specs[car_model_key]
    if not car.quick_id:
        car.quick_id = car.id
    car_dict = car.dict(by_alias=True)
    car_dict["updated_at"] = datetime.utcnow().isoformat()
    if "photos" not in car_dict or not car_dict["photos"]:
        car_dict["photos"] = {"main": "", "gallery": []}
    with _lock:
        data["cars"][car.id] = car_dict
        save_json(CARS_JSON, data)
    return car

@app.put(API_PREFIX + "/admin/cars/{car_id}")
def admin_update_car(car_id: str, car: Car):
    if car.id != car_id:
        raise HTTPException(400, "ID mismatch")
    data = load_json(CARS_JSON)
    if car_id not in data.get("cars", {}):
        raise HTTPException(404, "Not found")
    existing_car = data["cars"][car_id]
    car_model_key = car.model.lower() if car.model else ""
    if car_model_key in model_specs:
        car.specs = model_specs[car_model_key]
    if not car.quick_id:
        car.quick_id = car.id
    car_dict = {**existing_car, **car.dict(exclude_unset=True, by_alias=True)}
    car_dict["updated_at"] = datetime.utcnow().isoformat()
    with _lock:
        data["cars"][car.id] = car_dict
        save_json(CARS_JSON, data)
    return car

@app.delete(API_PREFIX + "/admin/cars/{car_id}")
def admin_delete_car(car_id: str):
    data = load_json(CARS_JSON)
    car_to_delete = data.get("cars", {}).get(car_id)
    if not car_to_delete:
        raise HTTPException(404, "Not found")
    with _lock:
        del data["cars"][car_id]
        save_json(CARS_JSON, data)
    car_class = car_to_delete.get("class")
    if car_class:
        upload_dir = IMAGES / car_class / car_id
        if upload_dir.exists() and upload_dir.is_dir():
            try:
                shutil.rmtree(upload_dir)
            except Exception as e:
                print(f"Error deleting directory {upload_dir}: {e}")
    return {"success": True}

@app.post(API_PREFIX + "/admin/bulk-price-update")
def bulk_update_prices(update: BulkPriceUpdate):
    """Массовое изменение цен по категории"""
    try:
        data = load_json(CARS_JSON)
        cars = data.get("cars", {})
        updated_count = 0
        for car_id, car in cars.items():
            if update.category != "all" and car.get("class") != update.category:
                continue
            if "pricing" not in car:
                continue
            seasons_to_update = []
            if update.season == "both":
                seasons_to_update = ["low_season", "high_season"]
            else:
                seasons_to_update = [update.season]
            for season in seasons_to_update:
                if season not in car["pricing"]:
                    continue
                for period in ["price_1_6", "price_7_14", "price_15_29", "price_30"]:
                    if period not in car["pricing"][season]:
                        continue
                    current_price = car["pricing"][season][period]
                    if update.adjustment_type == "percent":
                        new_price = int(current_price * (1 + update.adjustment_value / 100))
                    else:
                        new_price = int(current_price + update.adjustment_value)
                    new_price = max(0, new_price)
                    car["pricing"][season][period] = new_price
            car["updated_at"] = datetime.utcnow().isoformat()
            updated_count += 1
        with _lock:
            save_json(CARS_JSON, data)
        return {
            "success": True,
            "updated_count": updated_count,
            "message": f"Обновлено {updated_count} машин"
        }
    except Exception as e:
        raise HTTPException(500, f"Ошибка обновления цен: {str(e)}")

# ==============================
# DIALOG API ENDPOINTS
# ==============================

@app.get("/api/crm/dialog/{user_id}/status")
async def get_dialog_status(user_id: str):  # Ставим str, так как Union в путях FastAPI иногда капризничает
    # Внутри функции вы уже можете попробовать сконвертировать в int, если нужно
    target_id = int(user_id) if user_id.isdigit() else user_id
    try:
        dialog_status = get_dialog_status_from_history(user_id)
        return {"dialog": dialog_status}
    except Exception as e:
        print(f"❌ Error getting dialog status for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/dialog/{user_id}/events")
def get_dialog_events_endpoint(user_id: int, limit: int = Query(50, ge=1, le=200)):
    """Получить историю событий диалога"""
    try:
        events = get_dialog_events(user_id, limit)
        return {"events": events, "total": len(events)}
    except Exception as e:
        print(f"❌ Error getting dialog events for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/crm/dialog/{user_id}/mark-read")
def mark_dialog_read(user_id: int):
    """Сбросить флаг новых сообщений когда менеджер открыл чат"""
    try:
        log_dialog_event(
            user_id=user_id,
            action="messages_marked_read",
            by="manager"
        )
        return {"status": "ok"}
    except Exception as e:
        print(f"❌ Error marking dialog as read for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crm/dialogs/active")
def get_active_dialogs():
    """Получить список всех активных диалогов"""
    try:
        history_file = DATA / "crm_history.jsonl"
        user_dialogs = {}  # {user_id: {"status": dict, "last_event": dict}}
        
        # Читаем всю историю и группируем по user_id
        if history_file.exists():
            with open(history_file, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        user_id = event.get("user_id")
                        if user_id:
                            if user_id not in user_dialogs:
                                user_dialogs[user_id] = {
                                    "status": None,
                                    "last_event": event,
                                    "events_count": 1
                                }
                            else:
                                user_dialogs[user_id]["events_count"] += 1
                                # Обновляем последнее событие если это более позднее время
                                if event.get("timestamp", "") > user_dialogs[user_id]["last_event"].get("timestamp", ""):
                                    user_dialogs[user_id]["last_event"] = event
                    except json.JSONDecodeError:
                        continue
        
        # Анализируем статус каждого диалога
        active_dialogs = []
        for user_id, dialog_data in user_dialogs.items():
            try:
                status = get_dialog_status_from_history(user_id)
                if status["active"]:
                    active_dialogs.append({
                        "user_id": user_id,
                        "status": status,
                        "last_event": dialog_data["last_event"],
                        "events_count": dialog_data["events_count"]
                    })
            except Exception as e:
                print(f"⚠️ Error analyzing dialog for user {user_id}: {e}")
                continue
        
        # Сортируем по времени последнего события (новые сверху)
        active_dialogs.sort(key=lambda x: x["last_event"].get("timestamp", ""), reverse=True)
        
        return {
            "status": "ok",
            "active_dialogs": active_dialogs,
            "total_active": len(active_dialogs)
        }
        
    except Exception as e:
        print(f"❌ Error getting active dialogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(API_PREFIX + "/admin/upload-photos")
async def upload_photos(
    photos: List[UploadFile] = File(...),
    car_id: str = Form(...),
    car_class: str = Form(...)
):
    if car_class not in VALID_CLASSES:
        raise HTTPException(400, f"Неверный класс. Допустимо: {', '.join(VALID_CLASSES)}")
    upload_dir = IMAGES / car_class / car_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    existing_files = sorted([f for f in os.listdir(upload_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
    max_num = 0
    for fname in existing_files:
        try:
            num = int(Path(fname).stem)
            if num > max_num:
                max_num = num
        except:
            continue
    next_number = max_num + 1
    uploaded = []
    for photo in photos:
        if not photo.content_type or not photo.content_type.startswith("image/"):
            continue
        filename = f"{next_number}.jpg"
        file_path = upload_dir / filename
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            relative_url = f"{car_class}/{car_id}/{filename}"
            uploaded.append(relative_url)
            next_number += 1
        except Exception as e:
            raise HTTPException(500, f"Ошибка загрузки: {e}")
    if uploaded:
        data = load_json(CARS_JSON)
        if car_id in data.get("cars", {}):
            car_data = data["cars"][car_id]
            if "photos" not in car_data or not isinstance(car_data["photos"], dict):
                car_data["photos"] = {"main": "", "gallery": []}
            if "gallery" not in car_data["photos"]:
                car_data["photos"]["gallery"] = []
            current_gallery = car_data["photos"]["gallery"] or []
            new_gallery = current_gallery + uploaded
            car_data["photos"]["gallery"] = new_gallery
            car_data["photos"]["main"] = new_gallery[0] if new_gallery else ""
            car_data["updated_at"] = datetime.utcnow().isoformat()
            with _lock:
                data["cars"][car_id] = car_data
                save_json(CARS_JSON, data)
    return {"success": True, "uploaded": uploaded, "count": len(uploaded)}

# ============================================
# АВТОЗАПУСК АРХИВАЦИИ ПРИ СТАРТЕ
# ============================================
@app.on_event("startup")
async def startup_event():
    """Запускается при старте сервера"""
    print("🚀 Starting CRM auto-archive...")
    # ... (original startup logic)

# ==============================
# МУЛЬТИМЕДИА API ENDPOINTS
# ==============================

@app.get(API_PREFIX + "/crm/media/{user_id}")
async def get_user_media(user_id: int):
    """Получить список медиафайлов пользователя"""
    try:
        # Media files are in backend/media/ (consistent with telegram_bot.py)
        media_dir = Path(__file__).parent / "media" / str(user_id)
        
        if not media_dir.exists():
            return {
                "status": "ok",
                "user_id": user_id,
                "media_files": [],
                "total": 0
            }
        
        media_files = []
        
        # Сканируем все файлы в директории пользователя (включая подпапку incoming)
        directories_to_scan = [media_dir]
        
        # Добавляем подпапку incoming для обратной совместимости
        incoming_dir = media_dir / "incoming"
        if incoming_dir.exists():
            directories_to_scan.append(incoming_dir)
        
        for scan_dir in directories_to_scan:
            if not scan_dir.exists():
                continue
                
            for file_path in scan_dir.iterdir():
                if file_path.is_file():
                    file_stat = file_path.stat()
                    
                    # Определяем тип файла
                    file_extension = file_path.suffix.lower()
                    if file_extension in ['.jpg', '.jpeg', '.png', '.webp']:
                        file_type = "image"
                    elif file_extension == '.pdf':
                        file_type = "document"
                    else:
                        file_type = "other"
                    
                    # Для файлов в подпапке incoming добавляем префикс к пути скачивания
                    if scan_dir == incoming_dir:
                        download_path = f"incoming/{file_path.name}"
                    else:
                        download_path = file_path.name
                    
                    media_files.append({
                        "filename": file_path.name,
                        "file_type": file_type,
                        "file_size": file_stat.st_size,
                        "created_at": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                        "modified_at": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                        "download_url": f"/api/crm/media/{user_id}/download/{download_path}"
                    })
        
        # Сортируем по времени создания (новые сверху)
        media_files.sort(key=lambda x: x['created_at'], reverse=True)
        
        return {
            "status": "ok",
            "user_id": user_id,
            "media_files": media_files,
            "total": len(media_files)
        }
        
    except Exception as e:
        print(f"❌ Error getting media for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- 1. Единый эндпоинт для скачивания (Исправлен путь) ---
# Route for files with /download/ path (new format from get_user_media)
@app.get(API_PREFIX + "/crm/media/{user_id}/download/{filename}")
async def download_media_with_download_path(user_id: str, filename: str):
    return await download_media_common(user_id, filename, "")

# Route for files with path parameter (legacy)
@app.get(API_PREFIX + "/crm/media/{user_id}/{path:path}/{filename}")
async def download_media_with_path(user_id: str, filename: str, path: str = ""):
    return await download_media_common(user_id, filename, path)

# Route for files directly in user directory (main)
@app.get(API_PREFIX + "/crm/media/{user_id}/{filename}")
async def download_media_final(user_id: str, filename: str):
    return await download_media_common(user_id, filename, "")

async def download_media_common(user_id: str, filename: str, path: str = ""):
    try:
        print(f"📥 [DEBUG] Download request: user_id={user_id}, filename={filename}, path='{path}'")
        
        # Media files are in backend/media/ (consistent with telegram_bot.py)
        media_root = Path(__file__).parent / "media"
        
        # Handle case where filename contains "incoming/" prefix
        if filename.startswith("incoming/"):
            filename = filename[8:]  # Remove "incoming/" prefix
            file_path = media_root / str(user_id) / "incoming" / filename
        else:
            # Try direct path first (current structure)
            file_path = media_root / str(user_id) / filename
        
        # If not found, try old "incoming" structure (backward compatibility)
        if not file_path.exists():
            old_path = media_root / str(user_id) / "incoming" / filename
            if old_path.exists():
                file_path = old_path
                print(f"🔄 [DEBUG] Using old structure path: {file_path}")
            else:
                print(f"❌ File not found in either location: {file_path} or {old_path}")
                raise HTTPException(status_code=404, detail="File not found")
        
        print(f"🔍 [DEBUG] Checking path: {file_path} exists: {file_path.exists()}")
        
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        import mimetypes
        mime_type, _ = mimetypes.guess_type(str(file_path))
        print(f"📤 [DEBUG] Serving file: {file_path}, mime_type: {mime_type}")
        
        # Create response with CORS headers
        from fastapi import Response
        from starlette.responses import FileResponse
        
        response = FileResponse(
            path=str(file_path),
            media_type=mime_type or "application/octet-stream",
            filename=filename
        )
        
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
    except Exception as e:
        print(f"❌ Media download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. Быстрый чат (Чтобы не было 502 Bad Gateway) ---
@app.get(API_PREFIX + "/crm/chats/{user_id}")
async def get_user_chats_fast(user_id: str):
    try:
        chats = []
        t_id = str(user_id)
        
        if not CHAT_LOGS_JSONL.exists():
            return {"status": "ok", "chats": []}

        # Читаем только последние 500 строк, чтобы не вешать сервер
        try:
            with open(CHAT_LOGS_JSONL, 'r', encoding='utf-8') as f:
                # Читаем хвост файла
                lines = f.readlines()[-500:]
                for line in lines:
                    try:
                        entry = json.loads(line.strip())
                        if str(entry.get('user_id')) == t_id:
                            # Debug logging for chat data structure
                            if len(chats) < 3:  # Only log first 3 entries
                                print(f"📊 [DEBUG] Chat entry structure for user {user_id}:", {
                                    'has_media': 'media' in entry,
                                    'has_content': 'content' in entry,
                                    'media_keys': list(entry.get('media', {}).keys()) if entry.get('media') else None,
                                    'content_keys': list(entry.get('content', {}).keys()) if entry.get('content') else None,
                                    'role': entry.get('role'),
                                    'sample_entry': {k: v for k, v in entry.items() if k != 'media' and k != 'content'}
                                })
                            chats.append(entry)
                    except: continue
        except Exception as e:
            print(f"⚠️ Ошибка чтения файла чатов: {e}")

        print(f"📤 [DEBUG] Returning {len(chats)} chats for user {user_id}")
        return {"status": "ok", "chats": chats}
    except Exception as e:
        print(f"❌ Get chats error: {e}")
        return {"status": "error", "message": str(e), "chats": []}


@app.post(API_PREFIX + "/crm/send_media")
async def send_media_to_user(
    user_id: str = Form(...),
    message: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Отправить медиафайл пользователю через Telegram бота"""
    try:
        u_id_str = str(user_id)
        print(f"📤 Sending media to user {u_id_str}")
        
        # Проверка: если это web_session, мы не можем отправить файл через TG бота!
        if u_id_str.startswith("web_session"):
            raise HTTPException(
                status_code=400, 
                detail="Нельзя отправить файл в веб-сессию. Только пользователям Telegram."
            )
        
        # Проверяем тип файла
        allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Путь теперь строим через строковый ID (consistent with telegram_bot.py)
        media_dir = Path(__file__).parent / "media" / u_id_str
        media_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"sent_{timestamp}_{file.filename}"
        file_path = media_dir / safe_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Отправляем боту
        bot_url = os.getenv("TG_WEBHOOK_URL", "http://localhost:5001").rstrip('/')
        
        with open(file_path, 'rb') as media_file:
            files = {'media': (safe_filename, media_file, file.content_type)}
            data = {
                'user_id': u_id_str,
                'message': message or ""
            }
            
            response = requests.post(
                f"{bot_url}/internal/send_media",
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            # Структура для логирования
            media_object = {
                "type": "sent_media",
                "content_type": file.content_type,
                "download_url": f"/api/crm/media/{u_id_str}/{safe_filename}",
                "filename": safe_filename,
                "file_size": file_path.stat().st_size if file_path.exists() else 0
            }
            
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "user_id": u_id_str,
                "role": "manager",  # ✅ ИЗМЕНЕНО: manager, а не assistant
                "content": {
                    "text": message or "",
                    "message": message or "",
                    "media": media_object
                }
            }
            
            with open(CHAT_LOGS_JSONL, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            
            # Обновляем статус для CRM
            log_dialog_event(u_id_str, "manager_media_sent", {"filename": safe_filename})
            
            # ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: ВОЗВРАЩАЕМ JSON!
            return {
                "status": "ok",
                "message": "Media sent successfully",
                "media": media_object,
                "text": message or ""
            }
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Bot returned error: {response.text}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error send_media: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    
# ==============================
# ЗАПУСК
# ==============================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("web_integration:app", host="0.0.0.0", port=5000, reload=True)


