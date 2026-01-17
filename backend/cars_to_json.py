#!/usr/bin/env python3
import os
import json
import re
from pathlib import Path

class CarScanner:
    def __init__(self, base_path="/root/tgbot/webapp/public/images_web"):
        self.base_path = base_path
        self.categories = ["compact", "sedan", "suv", "7s"]
        
        # Маппинг моделей к маркам
        self.model_to_brand = {
            # Honda
            "jazz": "Honda", "city": "Honda", "civic": "Honda", "accord": "Honda", 
            "crv": "Honda", "hrv": "Honda", "brv": "Honda", "pilot": "Honda",
            
            # Toyota
            "yaris": "Toyota", "vios": "Toyota", "camry": "Toyota", "corolla": "Toyota",
            "innova": "Toyota", "fortuner": "Toyota", "hilux": "Toyota", "chr": "Toyota",
            "prius": "Toyota", "altis": "Toyota", "alphard": "Toyota","veloz": "Toyota","ativ": "Toyota",
            
            # Mazda
            "mazda2": "Mazda", "mazda3": "Mazda", "6": "Mazda", "cx3": "Mazda", "cx5": "Mazda", 
            "cx30": "Mazda", "bt50": "Mazda",
            
            # Nissan
            "almera": "Nissan", "sylphy": "Nissan", "teana": "Nissan", "xtrail": "Nissan",
            "navara": "Nissan", "march": "Nissan", "kicks": "Nissan",
            
            # Mitsubishi
            "mirage": "Mitsubishi", "attrage": "Mitsubishi", "xpander": "Mitsubishi",
            "pajero": "Mitsubishi", "triton": "Mitsubishi", "outlander": "Mitsubishi",
            "xforce": "Mitsubishi",
            
            # Isuzu
            "dmax": "Isuzu", "mux": "Isuzu",
            
            # Ford
            "fiesta": "Ford", "focus": "Ford", "everest": "Ford", "ranger": "Ford","raptor": "Ford",
            
            # MG
            "mg3": "MG", "mg5": "MG", "mgzs": "MG", "mghs": "MG",
            
            # Suzuki
            "swift": "Suzuki", "ciaz": "Suzuki", "ertiga": "Suzuki", "xl7": "Suzuki",
            
            # Hyundai
            "i10": "Hyundai", "accent": "Hyundai", "elantra": "Hyundai", "tucson": "Hyundai",
            
            # Kia
            "picanto": "Kia", "rio": "Kia", "cerato": "Kia", "sportage": "Kia",
              
            # Volvo
            "v60": "Volvo"
        }
        
        # Детальные характеристики по моделям
        self.model_specs = {
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
            "raptor": {"fuel": "Бензин", "engine": "3.5L V6", "power": "450 л.с.", "transmission": "Автомат 10AT"},
            "xpander": {"fuel": "Бензин", "engine": "1.5L", "power": "105 л.с.", "transmission": "Автомат"},
            "veloz": {"fuel": "Бензин", "engine": "1.5L", "power": "105 л.с.", "transmission": "CVT"}
        }
        
        # Цены из прайс-листа (с надбавкой 17%)
        self.model_pricing = {
            "yaris": {"oct_nov": {"monthly": 19500, "half": 12350, "days_1_6": 845}, "dec_feb": {"monthly": 22100, "half": 14300, "days_1_6": 975}},
            "ativ": {"oct_nov": {"monthly": 19500, "half": 12350, "days_1_6": 910}, "dec_feb": {"monthly": 23400, "half": 14300, "days_1_6": 1040}},
            "city": {"oct_nov": {"monthly": 18200, "half": 11000, "days_1_6": 800}, "dec_feb": {"monthly": 22100, "half": 14000, "days_1_6": 1000}},
            "mazda2": {"oct_nov": {"monthly": 18200, "half": 11700, "days_1_6": 780}, "dec_feb": {"monthly": 22100, "half": 13650, "days_1_6": 910}},
            "mg5": {"oct_nov": {"monthly": 20000, "half": 12000, "days_1_6": 950}, "dec_feb": {"monthly": 24000, "half": 14500, "days_1_6": 1100}},
            "civic": {"oct_nov": {"monthly": 32500, "half": 19500, "days_1_6": 1400}, "dec_feb": {"monthly": 39000, "half": 22100, "days_1_6": 1690}},
            "altis": {"oct_nov": {"monthly": 32500, "half": 19500, "days_1_6": 1430}, "dec_feb": {"monthly": 36400, "half": 20800, "days_1_6": 1560}},
            "camry": {"oct_nov": {"monthly": 32500, "half": 18850, "days_1_6": 1560}, "dec_feb": {"monthly": 36400, "half": 20800, "days_1_6": 1690}},
            "hrv": {"oct_nov": {"monthly": 32500, "half": 18850, "days_1_6": 1430}, "dec_feb": {"monthly": 39000, "half": 22100, "days_1_6": 1560}},
            "cx3": {"oct_nov": {"monthly": 28600, "half": 16900, "days_1_6": 1300}, "dec_feb": {"monthly": 33800, "half": 19500, "days_1_6": 1430}},
            "cx30": {"oct_nov": {"monthly": 32500, "half": 18850, "days_1_6": 1430}, "dec_feb": {"monthly": 39000, "half": 22100, "days_1_6": 1560}},
            "corolla": {"oct_nov": {"monthly": 32500, "half": 18850, "days_1_6": 1430}, "dec_feb": {"monthly": 39000, "half": 22100, "days_1_6": 1560}},
            "fortuner": {"oct_nov": {"monthly": 39000, "half": 22100, "days_1_6": 1820}, "dec_feb": {"monthly": 42900, "half": 24050, "days_1_6": 1950}},
            "xforce": {"oct_nov": {"monthly": 36400, "half": 20800, "days_1_6": 1820}, "dec_feb": {"monthly": 41600, "half": 23400, "days_1_6": 1950}},
            "v60": {"oct_nov": {"monthly": 52000, "half": 28600, "days_1_6": 2080}, "dec_feb": {"monthly": 58500, "half": 31200, "days_1_6": 2210}},
            "mux": {"oct_nov": {"monthly": 35000, "half": 20000, "days_1_6": 1500}, "dec_feb": {"monthly": 40000, "half": 23000, "days_1_6": 1700}},
            "raptor": {"oct_nov": {"monthly": 45000, "half": 25000, "days_1_6": 2000}, "dec_feb": {"monthly": 50000, "half": 28000, "days_1_6": 2300}},
            "xpander": {"oct_nov": {"monthly": 33800, "half": 19500, "days_1_6": 1560}, "dec_feb": {"monthly": 41600, "half": 23400, "days_1_6": 1690}},
            "veloz": {"oct_nov": {"monthly": 32500, "half": 18850, "days_1_6": 1430}, "dec_feb": {"monthly": 39000, "half": 22100, "days_1_6": 1560}}
        }
        
        # Депозиты по категориям
        self.deposits = {
            "compact": 5000,
            "sedan": 5000,
            "suv": 8000,
            "7s": 10000
        }

    def parse_folder_name(self, folder_name):
        """Парсит название папки: namo_yaris_sedan_black_2022"""
        parts = folder_name.split('_')
        if len(parts) < 4:
            print(f"⚠️ Неправильное название папки: {folder_name}")
            return None
            
        supplier = parts[0]
        model = parts[1].lower()
        
        # Проверяем есть ли тип кузова в названии
        if len(parts) == 5:
            body_type = parts[2]
            color = parts[3] 
            year = parts[4]
        else:
            body_type = ""
            color = parts[2]
            year = parts[3]
        
        brand = self.model_to_brand.get(model, "Unknown")
        
        if body_type:
            display_name = f"{brand} {model.upper()} {body_type.title()} {year} {color.title()}"
        else:
            display_name = f"{brand} {model.upper()} {year} {color.title()}"
        
        return {
            "supplier": supplier,
            "model": model,
            "brand": brand,
            "body_type": body_type,
            "color": color,
            "year": year,
            "display_name": display_name
        }

    def get_images_in_folder(self, folder_path):
        """Получает все изображения в папке"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        images = []
        
        for file in os.listdir(folder_path):
            if any(file.lower().endswith(ext) for ext in image_extensions):
                images.append(file)
        
        main_image = None
        other_images = []
        
        for img in images:
            if img.startswith('1.'):
                main_image = img
            else:
                other_images.append(img)
        
        other_images.sort()
        
        return [main_image] + other_images if main_image else sorted(images)

    def get_pricing(self, model, category):
        """Получает цены для модели"""
        pricing = self.model_pricing.get(model)
        
        if pricing:
            return {
                "low_season": {
                    "price_1_6": pricing["oct_nov"]["days_1_6"],
                    "price_7_14": round(pricing["oct_nov"]["half"] / 15),
                    "price_15_29": round(pricing["oct_nov"]["half"] / 15),
                    "price_30": round(pricing["oct_nov"]["monthly"] / 30)
                },
                "high_season": {
                    "price_1_6": pricing["dec_feb"]["days_1_6"],
                    "price_7_14": round(pricing["dec_feb"]["half"] / 15),
                    "price_15_29": round(pricing["dec_feb"]["half"] / 15),
                    "price_30": round(pricing["dec_feb"]["monthly"] / 30)
                },
                "deposit": self.deposits[category]
            }
        
        # Фоллбэк на базовые цены по категории
        base_prices = {
            "compact": {"low": {"1_6": 850, "7_14": 820, "15_29": 780, "30": 650}, "high": {"1_6": 980, "7_14": 950, "15_29": 910, "30": 750}},
            "sedan": {"low": {"1_6": 1150, "7_14": 1100, "15_29": 1000, "30": 850}, "high": {"1_6": 1450, "7_14": 1380, "15_29": 1250, "30": 1050}},
            "suv": {"low": {"1_6": 1500, "7_14": 1430, "15_29": 1300, "30": 1100}, "high": {"1_6": 1800, "7_14": 1700, "15_29": 1550, "30": 1300}},
            "7s": {"low": {"1_6": 1600, "7_14": 1500, "15_29": 1380, "30": 1150}, "high": {"1_6": 1950, "7_14": 1820, "15_29": 1680, "30": 1400}}
        }
        
        prices = base_prices[category]
        return {
            "low_season": {
                "price_1_6": prices["low"]["1_6"],
                "price_7_14": prices["low"]["7_14"],
                "price_15_29": prices["low"]["15_29"],
                "price_30": prices["low"]["30"]
            },
            "high_season": {
                "price_1_6": prices["high"]["1_6"],
                "price_7_14": prices["high"]["7_14"],
                "price_15_29": prices["high"]["15_29"],
                "price_30": prices["high"]["30"]
            },
            "deposit": self.deposits[category]
        }

    def get_specs(self, model, category):
        """Получает характеристики для модели"""
        specs = self.model_specs.get(model)
        
        # Базовые фичи по категориям
        features_by_category = {
            "compact": ["Кондиционер", "Камера заднего вида", "Bluetooth", "Экономичный"],
            "sedan": ["Кондиционер", "Камера заднего вида", "Круиз-контроль", "Просторный багажник"],
            "suv": ["Кондиционер", "Камера заднего вида", "Высокая посадка", "4WD"],
            "7s": ["7 мест", "Кондиционер", "Камера заднего вида", "Семейный минивэн"]
        }
        
        if specs:
            return {
                **specs,
                "features": features_by_category[category]
            }
        
        # Фоллбэк на базовые характеристики
        default_specs = {
            "compact": {"fuel": "Бензин", "engine": "1.2-1.5L", "power": "85-105 л.с.", "transmission": "Автомат"},
            "sedan": {"fuel": "Бензин", "engine": "1.5-2.0L", "power": "110-150 л.с.", "transmission": "Автомат"},
            "suv": {"fuel": "Бензин/Дизель", "engine": "1.8-2.8L", "power": "140-200 л.с.", "transmission": "Автомат"},
            "7s": {"fuel": "Бензин", "engine": "1.5-1.6L", "power": "105-140 л.с.", "transmission": "Автомат"}
        }
        
        return {
            **default_specs[category],
            "features": features_by_category[category]
        }

    def generate_car_data(self, category, folder_name, folder_path):
        """Генерирует данные для одной машины"""
        car_info = self.parse_folder_name(folder_name)
        if not car_info:
            return None
            
        images = self.get_images_in_folder(folder_path)
        if not images:
            print(f"⚠️ Нет изображений в папке: {folder_name}")
            return None
            
        car_id = f"{car_info['brand'].lower()}_{car_info['model']}_{car_info['year']}_{car_info['color']}"
        car_id = re.sub(r'[^a-z0-9_]', '', car_id)
        
        base_path = f"{category}/{folder_name}"
        main_photo = f"{base_path}/{images[0]}"
        gallery = [f"{base_path}/{img}" for img in images]
        
        quick_id = f"{car_info['model']}{car_info['year']}{car_info['color']}"
        quick_id = re.sub(r'[^a-z0-9]', '', quick_id.lower())
        
        import random
        
        car_data = {
            "id": car_id,
            "name": car_info["display_name"],
            "class": category,
            "supplier": car_info["supplier"],
            "brand": car_info["brand"],
            "model": car_info["model"].upper(),
            "color": car_info["color"].title(),
            "year": car_info["year"],
            "photos": {
                "main": main_photo,
                "gallery": gallery
            },
            "pricing": self.get_pricing(car_info["model"], category),
            "specs": self.get_specs(car_info["model"], category),
            "quick_id": quick_id,
            "rating": round(random.uniform(4.5, 4.9), 1),
            "available": True
        }
        
        return car_data

    def scan_categories(self):
        """Сканирует все категории и создает JSON"""
        cars_data = {"cars": {}, "categories": self.get_categories_data()}
        
        for category in self.categories:
            category_path = os.path.join(self.base_path, category)
            
            if not os.path.exists(category_path):
                print(f"⚠️ Папка не найдена: {category_path}")
                continue
                
            print(f"\n🔍 Сканирую категорию: {category}")
            
            for folder_name in os.listdir(category_path):
                folder_path = os.path.join(category_path, folder_name)
                
                if not os.path.isdir(folder_path):
                    continue
                    
                print(f"  📁 Обрабатываю: {folder_name}")
                
                car_data = self.generate_car_data(category, folder_name, folder_path)
                if car_data:
                    cars_data["cars"][car_data["id"]] = car_data
                    print(f"  ✅ {car_data['name']} - {car_data['pricing']['low_season']['price_30']}฿/день")
                else:
                    print(f"  ❌ Ошибка: {folder_name}")
        
        return cars_data

    def get_categories_data(self):
        """Возвращает данные категорий"""
        return {
            "compact": {
                "id": "compact",
                "name": "Compact",
                "nameRu": "Компактные авто",
                "description": "Лёгкие и экономичные для города и пляжей",
                "icon": "🚗",
                "gradient": "from-blue-400 to-blue-600",
                "features": ["Экономичный", "Легкая парковка", "Идеален для города"],
                "specs": "⛽ Бензин | 🔧 1.2-1.5L | ⚡ 85-105 л.с. | 🔄 Автомат"
            },
            "sedan": {
                "id": "sedan",
                "name": "Sedan",
                "nameRu": "Комфортные седаны", 
                "description": "Комфорт на трассе и в городе",
                "icon": "🚙",
                "gradient": "from-green-400 to-green-600",
                "features": ["Комфорт", "Просторный багажник", "Для дальних поездок"],
                "specs": "⛽ Бензин | 🔧 1.5-2.0L | ⚡ 110-150 л.с. | 🔄 Автомат"
            },
            "suv": {
                "id": "suv", 
                "name": "SUV",
                "nameRu": "Внедорожники",
                "description": "Высокая посадка и уверенность",
                "icon": "🚛",
                "gradient": "from-orange-400 to-orange-600",
                "features": ["Высокая посадка", "Проходимость", "Безопасность"],
                "specs": "⛽ Бензин/Дизель | 🔧 1.8-2.8L | ⚡ 140-200 л.с."
            },
            "7s": {
                "id": "7s",
                "name": "7 Seater", 
                "nameRu": "Семейные минивэны",
                "description": "Для семьи или компании",
                "icon": "🚐",
                "gradient": "from-purple-400 to-purple-600", 
                "features": ["7 мест", "Семейные поездки", "Максимум комфорта"],
                "specs": "⛽ Бензин | 🔧 1.5-1.6L | ⚡ 105-140 л.с."
            }
        }

    def save_json(self, data, output_path="/root/tgbot/webapp/public/data/web_cars.json"):
        """Сохраняет данные в JSON файл"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 JSON сохранен: {output_path}")
        print(f"📊 Всего машин: {len(data['cars'])}")

def main():
    print("🚗 Сканер автопарка с ценами и характеристиками")
    print("=" * 50)
    
    scanner = CarScanner()
    cars_data = scanner.scan_categories()
    scanner.save_json(cars_data)
    
    print("\n✅ Готово!")

if __name__ == "__main__":
    main()