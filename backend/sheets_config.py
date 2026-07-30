# Конфигурация для подключения к Google Sheets
# Файл: backend/sheets_config.py

import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

# Конфигурация Google Sheets
GOOGLE_SHEETS_CONFIG = {
    'SHEET_ID': '1HNI2qGBU36VMlivp9yQNH2Iy3yH3_ME6za3dRu2oxAs',
    'WORKSHEET_NAME': 'Bookings',
    'CREDENTIALS_FILE': 'credentials.json',  # Файл с учетными данными Google
    'SCOPE': [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
}

# Пути к файлам данных
DATA_PATHS = {
    'WEB_CARS_JSON': os.path.join(BACKEND_DIR, 'data', 'web_cars.json'),
    'CAR_PHOTOS_JSON': os.path.join(BACKEND_DIR, 'data', 'car_photos.json'),
    'CREDENTIALS_JSON': os.path.join(BACKEND_DIR, 'creds.json')
}

# Альтернативные пути для поиска файлов
FALLBACK_PATHS = {
    'WEB_CARS_JSON': [
        '../webapp/public/data/web_cars.json',
        'public/data/web_cars.json',
        'data/web_cars.json',
        'web_cars.json'
    ],
    'CAR_PHOTOS_JSON': [
        'car_photos.json',
        '../car_photos.json'
    ],
    'CREDENTIALS_JSON': [
        'credentials.json',
        '../credentials.json'
    ]
}

def find_file(file_key):
    """Ищет файл по основному пути и резервным путям."""
    # Сначала проверяем основной путь
    main_path = DATA_PATHS.get(file_key)
    if main_path and os.path.exists(main_path):
        return main_path
    
    # Проверяем резервные пути
    fallback_paths = FALLBACK_PATHS.get(file_key, [])
    for path in fallback_paths:
        if os.path.exists(path):
            return path
    
    return None

def get_cars_data_path():
    """Возвращает путь к файлу с данными автомобилей."""
    return find_file('WEB_CARS_JSON')

def get_credentials_path():
    """Возвращает путь к файлу с учетными данными Google."""
    return find_file('CREDENTIALS_JSON')

# Настройки API
API_CONFIG = {
    'HOST': '0.0.0.0',
    'PORT': 5000,
    'DEBUG': True,
    'CORS_ORIGINS': ['http://localhost:3000', 'http://localhost:5173']
}

# Логирование
LOGGING_CONFIG = {
    'LEVEL': 'INFO',
    'FORMAT': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'LOG_FILE': 'booking_api.log'
}
