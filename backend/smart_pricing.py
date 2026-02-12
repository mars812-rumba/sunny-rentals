# smart_pricing.py - Умная система отображения цен с гиперссылками

from datetime import datetime, timedelta
import math
import re




def calculate_price_for_period(car_data, days, is_high_season=False):
    """Рассчитывает цену для определенного периода"""
    
    # Определяем какой прайс использовать
    price_prefix = "high_price_" if is_high_season else "price_"
     # Добавить проверку
    if days <= 6:
        price_key = f"{price_prefix}1_4"
    elif days <= 13:
        price_key = f"{price_prefix}5_14"
    elif days <= 29:
        price_key = f"{price_prefix}15_29"
    else:
        price_key = f"{price_prefix}30"
    
    daily_price = car_data.get(price_key, 0)
    total_price = daily_price * days
    
    return {
        'daily_price': daily_price,
        'total_price': total_price,
        'price_tier': price_key
    }

def get_progressive_pricing_display(user_days, car_data, is_high_season=False):
    """Показывает цену пользователя + все выгодные варианты до месяца"""
    
    price_prefix = "high_price_" if is_high_season else "price_"
    
    # Текущая цена пользователя
    current_price = calculate_price_for_period(car_data, user_days, is_high_season)
    
    # Все возможные диапазоны (в порядке увеличения выгоды)
    price_ranges = [
        {"name": "неделя", "days": 7, "key": f"{price_prefix}5_14"}, 
        {"name": "2 недели", "days": 14, "key": f"{price_prefix}15_29"},
        {"name": "месяц", "days": 30, "key": f"{price_prefix}30"}
    ]
    
    result = []
    
    # Добавляем текущий период пользователя
    result.append({
        "period_name": f"{user_days} дн.",
        "days": user_days,
        "daily_price": current_price['daily_price'],
        "total_price": current_price['total_price'],
        "is_current": True
    })

    # Добавляем все более выгодные варианты
    for range_info in price_ranges:
        range_days = range_info["days"]

        # Показываем только периоды длиннее текущего
        if range_days > user_days:
            daily_price = car_data.get(range_info["key"], 0)
            total_price = daily_price * range_days
            
            result.append({
                "period_name": range_info["name"],
                "days": range_days,
                "daily_price": daily_price,
                "total_price": total_price,
                "is_current": False
            })
    
    return result

def format_progressive_pricing_compact(user_days, car_data, is_high_season=False, car_name=None):
    """Компактная версия для карточек с ГИПЕРССЫЛКАМИ в тексте"""
    
    pricing_options = get_progressive_pricing_display(user_days, car_data, is_high_season)
    
    # Текущая цена пользователя
    current = pricing_options[0]
    
    message = f"💰Стоимость = {current['total_price']:,}฿ за {user_days} дн."
    
    # Собираем все более выгодные варианты
    better_options = []
    for option in pricing_options[1:]:  # Пропускаем текущий вариант
        days = option["days"]
        total = option["total_price"]
        discount = (option["daily_price"]*days*100)/ total
        # Определяем название периода
        if days == 7:
            period_name = " 7 дней"
        elif days == 14:
            period_name = " 14 дней"
        elif days == 30:
            period_name = " 1 месяц"
        else:
            period_name = f"{days} дн."
        
        # 🔗 СОЗДАЕМ ГИПЕРССЫЛКИ ЧЕРЕЗ СУЩЕСТВУЮЩУЮ СИСТЕМУ quick_id
        if car_name and car_data.get("quick_id"):
            quick_id = car_data["quick_id"]
            # Используем существующую систему /start quickcar_
            quick_link = f"[💵 {total:,}฿ на {period_name} {discount}%](https://t.me/car_rental_booking_bot?start=quickcar_{quick_id}_{days})"
            better_options.append(quick_link)
        else:
            better_options.append(f"💵 {total:,}฿ на {period_name} ")
    
    # Если есть более выгодные варианты
    if better_options:
        message += "\n\n📉 Скидки на аренду от 10% до 50% в зависимости от длительности👇"
        
        # Каждый вариант на отдельной строке
        for option in better_options:
            message += f"\n**{option}**"
    
    return message
    

# 🔧 АЛЬТЕРНАТИВНЫЙ ВАРИАНТ - ЕСЛИ ХОЧЕШЬ ПОКАЗАТЬ СКИДКУ ОТ БАЗОВОЙ ЦЕНЫ:

def format_progressive_pricing_compact(user_days, car_data, is_high_season=False, car_name=None):
    """Версия со скидкой от базовой цены (1-4 дня)"""
    
    pricing_options = get_progressive_pricing_display(user_days, car_data, is_high_season)
    
    # Текущая цена пользователя
    current = pricing_options[0]
    
    # Базовая цена (1-4 дня) для расчета скидок
    prefix = "high_" if is_high_season else ""
    base_daily_price = car_data.get(f"{prefix}price_1_4", 0)
    
    message = f"💰Стоимость = {current['total_price']:,}฿ за {user_days} дн."
    
    # Собираем все более выгодные варианты
    better_options = []
    for option in pricing_options[1:]:  # Пропускаем текущий вариант
        days = option["days"]
        total = option["total_price"]
        option_daily_price = option["daily_price"]
        
        # 🔧 СКИДКА ОТ БАЗОВОЙ ЦЕНЫ (1-4 дня):
        if base_daily_price > 0:
            base_cost = base_daily_price * days  # Сколько стоило бы по базовой цене
            actual_cost = total  # Реальная цена
            discount_percent = int(((base_cost - actual_cost) / base_cost) * 100)
        else:
            discount_percent = 0
        
        # Определяем название периода
        if days == 7:
            period_name = "неделю"
        elif days == 14:
            period_name = "2 недели"
        elif days == 30:
            period_name = "месяц"
        else:
            period_name = f"{days} дн."
        
        # Показываем скидку только если она значительная
        if discount_percent >= 5:  # Показываем скидки от 5%
            discount_text = f"\nБез скидки: {base_cost:,}฿ (*{discount_percent}%* выгода)"
        else:
            discount_text = ""
        
        # 🔗 СОЗДАЕМ ГИПЕРССЫЛКИ
        if car_name and car_data.get("quick_id"):
            quick_id = car_data["quick_id"]
            quick_link = f"[💵 {total:,}฿ на {period_name}](https://t.me/car_rental_booking_bot?start=quickcar_{quick_id}_{days}){discount_text}"
            better_options.append(quick_link)
        else:
            better_options.append(f"💵 {total:,}฿ на {period_name}{discount_text}")
    # Если есть более выгодные варианты
    if better_options:
        message += "\n\n📉 *ВЫГОДНЫЕ ПЕРИОДЫ:*"
        
        # Каждый вариант на отдельной строке
        for option in better_options:
            message += f"\n{option}"
    
    return message

def format_progressive_pricing_with_buttons(user_days, car_data, is_high_season=False, car_name=None):
    """Версия БЕЗ кнопок - только текст с гиперссылками"""
    
    # Используем компактную версию с гиперссылками
    pricing_text = format_progressive_pricing_compact(user_days, car_data, is_high_season, car_name)
    
    # Возвращаем пустой список кнопок
    return pricing_text, []

# 🔗 ФУНКЦИИ ДЛЯ ОБРАБОТКИ БЫСТРЫХ ССЫЛОК ЧЕРЕЗ СУЩЕСТВУЮЩУЮ СИСТЕМУ

def update_user_period_from_quickcar(chat_id, new_days):
    """Обновляет период пользователя при клике на быстрые ссылки"""
    from datetime import timedelta
    
    # Предполагаем что есть функция get_user_data
    data = globals().get('get_user_data', lambda x: {})(chat_id)
    
    start_date = data.get("start_obj")
    if start_date:
        new_end_date = start_date + timedelta(days=new_days)
        data["end_obj"] = new_end_date
        data["end_date"] = new_end_date.strftime("%Y-%m-%d")
        data["days"] = new_days
        
        # Обновляем доступные машины
        if 'get_available_cars' in globals():
            try:
                available_cars = globals()['get_available_cars'](start_date, new_end_date)
                data["available_cars"] = available_cars
            except Exception as e:
                print(f"⚠️ Ошибка обновления доступных авто: {e}")
        
        return True
    return False

if __name__ == "__main__":
    test_progressive_pricing()


