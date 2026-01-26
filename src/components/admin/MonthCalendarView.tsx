import React, { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isToday 
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Booking } from '@/api/api.ts';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DayEvent {
  type: 'pickup' | 'return';
  time: string;
  carName: string;
  booking: Booking;
}

interface MonthCalendarViewProps {
  currentDate: Date;
  bookings: Booking[];
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  onDayClick: (date: Date, events: DayEvent[]) => void;
}

export function MonthCalendarView({
  currentDate,
  bookings,
  onDateChange,
  onBookingClick,
  onDayClick,
}: MonthCalendarViewProps) {
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    
    bookings.forEach(booking => {
      const start = booking.form_data?.dates?.start || booking.start_date;
      const end = booking.form_data?.dates?.end || booking.end_date;
      
      if (!start || !end) return;

      const startDate = new Date(start);
      const endDate = new Date(end);
      const carName = booking.form_data?.car?.model || booking.form_data?.car?.name || 'Авто';

      // Выдача
      const pickupKey = format(startDate, 'yyyy-MM-dd');
      if (!map.has(pickupKey)) map.set(pickupKey, []);
      map.get(pickupKey)!.push({
        type: 'pickup',
        time: format(startDate, 'HH:mm'),
        carName,
        booking,
      });

      // Возврат
      const returnKey = format(endDate, 'yyyy-MM-dd');
      if (!map.has(returnKey)) map.set(returnKey, []);
      map.get(returnKey)!.push({
        type: 'return',
        time: format(endDate, 'HH:mm'),
        carName,
        booking,
      });
    });

    map.forEach(events => events.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [bookings]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="bg-white min-h-[600px] flex flex-col select-none">
      {/* Хедер - НЕПРОЗРАЧНЫЙ с тенью */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDateChange(addDays(startOfMonth(currentDate), -1))} 
            className="h-8 w-8 p-0 border-gray-300"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDateChange(new Date())} 
            className="h-8 px-4 text-xs font-medium text-gray-600 border-gray-300"
          >
            Сегодня
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onDateChange(addDays(endOfMonth(currentDate), 1))} 
            className="h-8 w-8 p-0 border-gray-300"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
        
        {/* Месяц и год - МЕНЬШЕ, в одну строку */}
        <h3 className="text-sm font-medium text-slate-600 capitalize">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </h3>
        
        <div className="w-24" /> 
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
        {weekDays.map((day) => (
          <div key={day} className="py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className="flex-1 grid grid-flow-row auto-rows-fr divide-y divide-gray-100">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-100">
            {week.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDay.get(dayKey) || [];
              const pickups = events.filter(e => e.type === 'pickup');
              const returns = events.filter(e => e.type === 'return');
              
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayIsToday = isToday(day);

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-[100px] p-2 transition-all cursor-pointer group",
                    !isCurrentMonth ? "bg-gray-50/30 opacity-40" : "bg-white hover:bg-blue-50/40"
                  )}
                  onClick={() => onDayClick(day, events)}
                >
                  {/* Номер дня */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                      dayIsToday 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                        : isCurrentMonth 
                          ? "text-slate-500 group-hover:text-blue-600" 
                          : "text-gray-300"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Узкие полоски-бейджи - цвета как в AdminScheduler */}
                  <div className="space-y-0.5">
                    {/* Все события - цвет по статусу как в Gantt */}
                    {pickups.map((pickup, idx) => {
                      const status = pickup.booking.status || 'pending';
                      const bgColor = status === 'confirmed' ? '#70eeb5' : '#70eeb5'; // Зеленый или желтый
                      return (
                        <div 
                          key={`pickup-${idx}`}
                          className="h-1 rounded-full shadow-sm" 
                          style={{ width: '100%', backgroundColor: bgColor }}
                          title={`${pickup.time} - ${pickup.carName} (${status})`} 
                        />
                      );
                    })}
                    {returns.map((returnEvent, idx) => {
                      const status = returnEvent.booking.status || 'pending';
                      const bgColor = status === 'confirmed' ? '#86efac' : '#fde047'; // Зеленый или желтый
                      return (
                        <div 
                          key={`return-${idx}`}
                          className="h-1 rounded-full shadow-sm" 
                          style={{ width: '100%', backgroundColor: bgColor }}
                          title={`${returnEvent.time} - ${returnEvent.carName} (${status})`} 
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}