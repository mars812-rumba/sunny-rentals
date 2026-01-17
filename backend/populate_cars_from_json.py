#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт для заполнения Google Sheets автомобилями из web_cars.json
Файл: backend/populate_cars_from_json.py
"""

import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime, timedelta
import os
import sys

# Конфигурация
SHEET_ID = '1HNI2qGBU36VMlivp9yQNH2Iy3yH3_ME6za3dRu2oxAs'
WORKSHEET_NAME = 'Bookings'
DAYS_TO_GENERATE = 365  # Количество дней для заголовков

# Пути к файлам
WEB_CARS_JSON_PATHS = [
    '../public/data/web_cars.json',
    'public/data/web_cars.json',
    'data/web_cars.json',
    'web_cars.json',
    '../root/tgbot/webapp/public/data/web_cars.json'
]

CREDENTIALS_PATHS = [
    'creds.json',
    '../creds.json',
    '../root/tgbot/creds.json'
]

def find_file(paths, description):
    """Поиск файла по списку путей."""
    for path in paths:
        if os.path.exists(path):
            print(f"✅ Найден {description}: {path}")
            return path
    
    print(f"❌ Не найден {description}. Проверенные пути:")
    for path in paths:
        print(f"   - {path}")
    return None

def load_web_cars():
    """Загрузка данных автомобилей из web_cars.json."""
    json_path = find_file(WEB_CARS_JSON_PATHS, "web_cars.json")
    if not json_path:
        return None
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"📊 Загружено из {json_path}")
        print(f"🔍 Структура данных: {type(data)}")
        print(f"📋 Ключи верхнего уровня: {list(data.keys())}")
        
        # Проверяем структуру - возможно данные в подобъекте
        if 'cars' in data and isinstance(data['cars'], dict):
            print("🎯 Найден объект 'cars' в JSON, используем его")
            cars_data = data['cars']
        elif isinstance(data, dict) and all(isinstance(v, dict) for v in data.values()):
            # Это уже объект с автомобилями
            cars_data = data
        else:
            print(f"❌ Неожиданная структура JSON. Ожидался объект с автомобилями.")
            print(f"📄 Пример правильной структуры:")
            print(f'   {{"Toyota Camry 2024": {{"category": "sedan"}}, ...}}')
            return None
        
        print(f"🚗 Найдено автомобилей: {len(cars_data)}")
        
        # Показываем первые несколько автомобилей для проверки
        for i, (car_name, car_data) in enumerate(list(cars_data.items())[:3]):
            category = car_data.get('category', 'unknown') if isinstance(car_data, dict) else 'unknown'
            print(f"   {i+1}. {car_name} -> {category}")
        
        if len(cars_data) > 3:
            print(f"   ... и еще {len(cars_data) - 3}")
        
        return cars_data
    except Exception as e:
        print(f"❌ Ошибка загрузки web_cars.json: {e}")
        return None

def connect_to_sheets():
    """Подключение к Google Sheets."""
    creds_path = find_file(CREDENTIALS_PATHS, "creds.json")
    if not creds_path:
        return None
    
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = ServiceAccountCredentials.from_json_keyfile_name(creds_path, scope)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(SHEET_ID)
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
        
        print(f"✅ Подключение к Google Sheets успешно")
        print(f"📋 Таблица: {spreadsheet.title}")
        print(f"📄 Лист: {worksheet.title}")
        
        return worksheet
    except Exception as e:
        print(f"❌ Ошибка подключения к Google Sheets: {e}")
        return None

def generate_date_headers(days=365):
    """Генерация заголовков с датами."""
    today = datetime.today()
    headers = ["CAR_NAME"]  # Первая колонка - название автомобиля
    
    for i in range(days):
        date = today + timedelta(days=i)
        headers.append(date.strftime("%Y-%m-%d"))
    
    return headers

def populate_sheet_with_cars(cars_data):
    """Заполнение таблицы автомобилями."""
    # Подключаемся к таблице
    worksheet = connect_to_sheets()
    if not worksheet:
        return False
    
    try:
        # Генерируем заголовки
        headers = generate_date_headers(DAYS_TO_GENERATE)
        print(f"📅 Сгенерировано заголовков дат: {len(headers) - 1}")
        
        # Получаем список автомобилей
        car_names = list(cars_data.keys())
        print(f"🚗 Автомобили для добавления:")
        for i, car_name in enumerate(car_names, 1):
            category = cars_data[car_name].get('category', 'unknown')
            print(f"   {i}. {car_name} ({category})")
        
        # Подтверждение
        response = input(f"\n❓ Заполнить таблицу {len(car_names)} автомобилями? (y/n): ")
        if response.lower() != 'y':
            print("❌ Операция отменена")
            return False
        
        # Очищаем таблицу
        print("🧹 Очистка таблицы...")
        worksheet.clear()
        
        # Подготавливаем данные для batch обновления
        # Первая строка - заголовки
        batch_data = [headers]
        
        # Добавляем строки для каждого автомобиля
        for car_name in car_names:
            row = [car_name]  # Первая колонка - название
            # Остальные колонки пустые (для дат бронирования)
            batch_data.append(row)
        
        # Записываем все данные за один раз
        print("💾 Запись данных в таблицу...")
        range_name = f"A1:A{len(batch_data)}"  # Записываем только названия автомобилей
        worksheet.update(range_name, [[row[0]] for row in batch_data])
        
        # Записываем заголовки отдельно (они длинные)
        print("📅 Запись заголовков дат...")
        worksheet.update('1:1', [headers])
        
        print(f"✅ Таблица успешно заполнена!")
        print(f"📊 Добавлено автомобилей: {len(car_names)}")
        print(f"📅 Колонок с датами: {len(headers) - 1}")
        print(f"🔗 Ссылка на таблицу: https://docs.google.com/spreadsheets/d/{SHEET_ID}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при заполнении таблицы: {e}")
        return False

def show_current_cars():
    """Показать текущие автомобили в таблице."""
    worksheet = connect_to_sheets()
    if not worksheet:
        return
    
    try:
        # Получаем все значения
        all_values = worksheet.get_all_values()
        if not all_values:
            print("📋 Таблица пуста")
            return
        
        print(f"📋 Текущее содержимое таблицы ({len(all_values)} строк):")
        
        # Показываем заголовки
        if len(all_values) > 0:
            headers = all_values[0]
            print(f"   Заголовки: {headers[0]} + {len(headers) - 1} дат")
        
        # Показываем автомобили
        if len(all_values) > 1:
            print("   Автомобили:")
            for i, row in enumerate(all_values[1:], 1):
                if row and row[0]:
                    car_name = row[0]
                    # Считаем занятые даты
                    booked_count = sum(1 for cell in row[1:] if cell.strip() == "-")
                    print(f"      {i}. {car_name} (забронировано дней: {booked_count})")
        
    except Exception as e:
        print(f"❌ Ошибка при чтении таблицы: {e}")

def main():
    """Главная функция."""
    print("🚗 Скрипт заполнения Google Sheets автомобилями из web_cars.json")
    print("=" * 60)
    
    # Проверяем аргументы командной строки
    if len(sys.argv) > 1:
        if sys.argv[1] == "--show":
            show_current_cars()
            return
        elif sys.argv[1] == "--help":
            print("Использование:")
            print("  python populate_cars_from_json.py           # Заполнить таблицу")
            print("  python populate_cars_from_json.py --show    # Показать текущее содержимое")
            print("  python populate_cars_from_json.py --help    # Эта справка")
            return
    
    # Загружаем данные автомобилей
    cars_data = load_web_cars()
    if not cars_data:
        print("❌ Не удалось загрузить данные автомобилей")
        return
    
    # Показываем текущее состояние
    print("\n1️⃣ Текущее состояние таблицы:")
    show_current_cars()
    
    print(f"\n2️⃣ Готовые к добавлению автомобили из JSON:")
    for car_name, car_data in cars_data.items():
        category = car_data.get('category', 'unknown')
        rating = car_data.get('rating', 'N/A')
        print(f"   • {car_name} ({category}, рейтинг: {rating})")
    
    # Заполняем таблицу
    print(f"\n3️⃣ Заполнение таблицы:")
    success = populate_sheet_with_cars(cars_data)
    
    if success:
        print(f"\n🎉 Готово! Таблица заполнена и готова для бронирований.")
        print(f"💡 Теперь можно запускать web_integration.py для работы с календарем.")
    else:
        print(f"\n❌ Не удалось заполнить таблицу.")

if __name__ == "__main__":
    main()