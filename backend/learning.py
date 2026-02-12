# learning.py - Модуль обучения на основе логов

import os
from collections import Counter
from datetime import datetime

class LearningSystem:
    """Система обучения на основе анализа логов"""
    
    def __init__(self, logs_dir="logs"):
        self.logs_dir = logs_dir
        if not os.path.exists(logs_dir):
            os.makedirs(logs_dir)
    
    def analyze_successful_patterns(self):
        """Анализирует логи и находит успешные паттерны"""
        successful_phrases = []
        failed_phrases = []
        client_responses = []
        
        for log_file in os.listdir(self.logs_dir):
            if not log_file.endswith('.txt'):
                continue
                
            try:
                with open(f"{self.logs_dir}/{log_file}", 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    # Определяем успешность диалога
                    is_successful = self._is_dialog_successful(content)
                    
                    # Анализируем фразы менеджера и клиента
                    for i, line in enumerate(lines):
                        if self._is_manager_message(line):
                            manager_text = self._extract_message_text(line)
                            if manager_text:
                                if is_successful:
                                    successful_phrases.append(manager_text)
                                else:
                                    failed_phrases.append(manager_text)
                        
                        elif self._is_client_message(line):
                            client_text = self._extract_message_text(line)
                            if client_text:
                                client_responses.append({
                                    'text': client_text,
                                    'successful': is_successful
                                })
            except Exception as e:
                print(f"Ошибка анализа {log_file}: {e}")
        
        return {
            'successful_phrases': successful_phrases,
            'failed_phrases': failed_phrases,
            'client_responses': client_responses
        }
    
    def _is_dialog_successful(self, content):
        """Определяет успешность диалога по ключевым словам"""
        success_indicators = [
            'получены документы',
            'паспорт отправлен',
            'права отправлены', 
            'whatsapp:',
            'время доставки',
            'отель:',
            'прилет:',
            'готово',
            'все документы',
            'увидимся'
        ]
        
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in success_indicators)
    
    def _is_manager_message(self, line):
        """Проверяет, является ли строка сообщением менеджера"""
        return any(prefix in line for prefix in ['BOT:', 'Claude:', 'Manager:', '[Manager]'])
    
    def _is_client_message(self, line):
        """Проверяет, является ли строка сообщением клиента"""
        return any(prefix in line for prefix in ['CLIENT:', 'User:', '[Client]'])
    
    def _extract_message_text(self, line):
        """Извлекает текст сообщения из строки лога"""
        try:
            # Убираем префиксы и извлекаем текст
            for prefix in ['BOT:', 'Claude:', 'Manager:', 'CLIENT:', 'User:', '[Manager]', '[Client]']:
                if prefix in line:
                    text = line.split(prefix, 1)[1].strip()
                    return text if len(text) > 5 else None  # Игнорируем слишком короткие
            return None
        except:
            return None
    
    def generate_insights(self):
        """Генерирует инсайты для улучшения Claude"""
        patterns = self.analyze_successful_patterns()
        
        if not patterns['successful_phrases']:
            return ""
        
        # Находим самые частые успешные фразы
        successful_counter = Counter(patterns['successful_phrases'])
        top_successful = successful_counter.most_common(5)
        
        failed_counter = Counter(patterns['failed_phrases'])
        top_failed = failed_counter.most_common(3)
        
        # Анализируем клиентские ответы
        positive_responses = [r['text'] for r in patterns['client_responses'] 
                            if r['successful'] and len(r['text']) > 3]
        negative_responses = [r['text'] for r in patterns['client_responses'] 
                            if not r['successful'] and len(r['text']) > 3]
        
        insights = f"""
📚 ДАННЫЕ ИЗ {len(os.listdir(self.logs_dir))} ДИАЛОГОВ:

✅ РАБОТАЮЩИЕ ФРАЗЫ МЕНЕДЖЕРА:
{chr(10).join([f"• {phrase[0]}" for phrase in top_successful[:3]])}

❌ ИЗБЕГАЙ ФРАЗ:
{chr(10).join([f"• {phrase[0]}" for phrase in top_failed[:2]])}

💬 КЛИЕНТЫ ПОЛОЖИТЕЛЬНО ОТВЕЧАЮТ НА:
{chr(10).join([f"• {resp}" for resp in positive_responses[:3]])}

🎯 ПРИЗНАКИ УСПЕХА: документы получены, время согласовано, контакты обменены
"""
        
        return insights
    
    def get_statistics(self):
        """Возвращает статистику для админа"""
        patterns = self.analyze_successful_patterns()
        
        total_dialogs = len(os.listdir(self.logs_dir))
        successful_count = len([r for r in patterns['client_responses'] if r['successful']])
        failed_count = len([r for r in patterns['client_responses'] if not r['successful']])
        
        success_rate = (successful_count / (successful_count + failed_count) * 100) if (successful_count + failed_count) > 0 else 0
        
        return {
            'total_dialogs': total_dialogs,
            'successful_dialogs': successful_count,
            'failed_dialogs': failed_count,
            'success_rate': round(success_rate, 1),
            'successful_phrases_count': len(patterns['successful_phrases']),
            'failed_phrases_count': len(patterns['failed_phrases'])
        }
    
    def should_update_prompt(self):
        """Определяет, нужно ли обновить промпт на основе новых данных"""
        # Обновляем промпт каждые 10 новых диалогов
        return len(os.listdir(self.logs_dir)) % 10 == 0

# Функции для интеграции с основным ботом
learning_system = LearningSystem()

def get_learning_insights():
    """Получить инсайты для Claude (вызывается из основного бота)"""
    try:
        return learning_system.generate_insights()
    except Exception as e:
        print(f"Ошибка получения инсайтов: {e}")
        return ""

def get_learning_stats():
    """Получить статистику для админа"""
    try:
        return learning_system.get_statistics()
    except Exception as e:
        print(f"Ошибка получения статистики: {e}")
        return {}

def should_use_learning():
    """Проверить, есть ли достаточно данных для обучения"""
    try:
        stats = learning_system.get_statistics()
        return stats['total_dialogs'] >= 3  # Минимум 3 диалога для начала обучения
    except:
        return False

if __name__ == "__main__":
    # Тестирование модуля
    print("🧠 Тестирование модуля обучения...")
    insights = get_learning_insights()
    stats = get_learning_stats()
    print(f"Инсайты: {insights}")
    print(f"Статистика: {stats}")