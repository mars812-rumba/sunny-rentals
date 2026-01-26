import React, { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Booking } from '@/api/api.ts';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthCalendarViewProps {
  currentDate: Date;
  bookings: Booking[];
  onDateChange: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  onDayClick: (date: Date) => void;
}

interface DayEvent {
  type: 'pickup' | 'return';
  time: string;
  carName: string;
  booking: Booking;
}

export function MonthCalendarView({
  currentDate,
  bookings,
  onDateChange,
  onBookingClick,
  onDayClick,
}: MonthCalendarViewProps) {
  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // Map bookings to days
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    
    bookings.forEach(booking => {
      const startDate = new Date(booking.form_data.dates.start);
      const endDate = new Date(booking.form_data.dates.end);
      const carName = booking.form_data.car.model || booking.form_data.car.name || 'Авто';
      const startTime = format(startDate, 'HH:mm');
      const endTime = format(endDate, 'HH:mm');

      // Pickup event
      const pickupKey = format(startDate, 'yyyy-MM-dd');
      if (!map.has(pickupKey)) map.set(pickupKey, []);
      map.get(pickupKey)!.push({
        type: 'pickup',
        time: startTime,
        carName,
        booking,
      });

      // Return event
      const returnKey = format(endDate, 'yyyy-MM-dd');
      if (!map.has(returnKey)) map.set(returnKey, []);
      map.get(returnKey)!.push({
        type: 'return',
        time: endTime,
        carName,
        booking,
      });
    });

    // Sort events by time
    map.forEach((events) => {
      events.sort((a, b) => a.time.localeCompare(b.time));
    });

    return map;
  }, [bookings]);

  const goToPrevMonth = () => {
    onDateChange(addDays(startOfMonth(currentDate), -1));
  };

  const goToNextMonth = () => {
    onDateChange(addDays(endOfMonth(currentDate), 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="bg-[hsl(217, 18.80%, 86.50%)] min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[hsl(223, 33.30%, 85.30%)] border-b border-[hsl(218, 33.30%, 87.10%)]/50 px-3 py-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPrevMonth} 
              className="h-8 w-8 p-0 text-[hsl(220,8%,55%)] hover:text-[hsl(226, 15.00%, 37.80%)] hover:bg-[hsl(217, 14.50%, 56.90%)]/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToToday} 
              className="h-8 px-3 text-xs font-medium text-[hsl(220,8%,55%)] hover:text-[hsl(224, 17.20%, 65.90%)] hover:bg-[hsl(218, 13.20%, 44.70%)]/50"
            >
              Сегодня
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNextMonth} 
              className="h-8 w-8 p-0 text-[hsl(220,8%,55%)] hover:text-[hsl(148, 36.60%, 75.90%)] hover:bg-[hsl(154, 30.10%, 28.60%)]/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-base font-semibold text-[hsl(220,10%,92%)] capitalize">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[hsl(217, 25.00%, 81.20%)]/30">
        {weekDays.map((day, i) => (
          <div 
            key={day} 
            className={cn(
              "py-2 text-center text-[10px] font-semibold uppercase",
              i >= 5 ? "text-[hsl(220,8%,50%)]" : "text-[hsl(220,8%,60%)]"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y divide-[hsl(219, 19.60%, 80.00%)]/20">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-[hsl(220, 19.00%, 84.50%)]/20">
            {week.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayIsToday = isToday(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const maxVisible = 3;
              const hiddenCount = events.length - maxVisible;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-[100px] p-1 cursor-pointer transition-colors",
                    !isCurrentMonth && "bg-[hsl(219, 11.60%, 66.30%)]/50",
                    isCurrentMonth && isWeekend && "bg-[hsl(220, 9.20%, 61.60%)]",
                    isCurrentMonth && !isWeekend && "bg-[hsl(216, 10.80%, 63.50%)]",
                    "hover:bg-[hsl(220,16%,20%)]"
                  )}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                        dayIsToday && "bg-[hsl(200,80%,55%)] text-white",
                        !dayIsToday && isCurrentMonth && "text-[hsl(220,10%,85%)]",
                        !dayIsToday && !isCurrentMonth && "text-[hsl(220,8%,40%)]"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {events.slice(0, maxVisible).map((event, i) => (
                      <div
                        key={i}
                        className={cn(
                          "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer transition-all",
                          "hover:scale-[1.02] hover:shadow-md",
                          event.type === 'pickup' 
                            ? "bg-[hsl(160,70%,35%)] text-white" 
                            : "bg-[hsl(35,80%,45%)] text-white"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick(event.booking);
                        }}
                      >
                        <span className="flex items-center gap-0.5">
                          {event.type === 'pickup' ? (
                            <ArrowUp className="h-2 w-2 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="h-2 w-2 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            {event.time} {event.carName}
                          </span>
                        </span>
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <div className="text-[9px] text-[hsl(220,8%,55%)] px-1">
                        Ещё {hiddenCount}
                      </div>
                    )}
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
