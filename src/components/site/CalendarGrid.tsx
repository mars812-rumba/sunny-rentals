import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { format, addDays, differenceInDays, startOfDay, isSameDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Car, Booking } from '@/api/api';
import { cn } from '@/lib/utils';
import { getCarMainPhoto } from '@/utils/imageUtils';

// 🎨 Получить URL фото
const getPhotoUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return `${API_BASE}/images_web/${filename}`;
};

interface CalendarGridProps {
  cars: Car[];
  bookings: Booking[];
  startDate: Date;
  daysToShow: number;
  onBookingClick: (booking: Booking) => void;
  onCreateBooking: (carId: string, dateRange: { start: Date; end: Date }) => void;
  carOwnersMap?: Record<string, string>;
}

const DAY_WIDTH = 24;
const CAR_ROW_HEIGHT = 40; // Компактная высота
const HEADER_HEIGHT = 32;
const SIDEBAR_WIDTH = 60;
const TOTAL_DAYS = 97; // 7 дней назад + 90 дней вперёд (3 месяца)

// 🎨 Цвета для месяцев
const MONTH_COLORS: Record<number, string> = {
  0: '#f8f9fa', 1: '#f1f3f5', 2: '#e9ecef', 3: '#dee2e6',
  4: '#ced4da', 5: '#adb5bd', 6: '#ced4da', 7: '#dee2e6',
  8: '#e9ecef', 9: '#f1f3f5', 10: '#f8f9fa', 11: '#f1f3f5'
};

export function CalendarGrid({
  cars,
  bookings,
  startDate,
  onBookingClick,
  onCreateBooking,
  carOwnersMap = {},
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);
  
  // ✅ Диалог с инфо о машине
  const [selectedCarInfo, setSelectedCarInfo] = useState<{car: Car, owner: string | null} | null>(null);
  
  // ✅ ТОЛЬКО двойной клик открывает модалку
  const [lastBookingTap, setLastBookingTap] = useState<{
    bookingId: string;
    timestamp: number;
  } | null>(null);
  const DOUBLE_TAP_DELAY = 300;
  
  // ✅ Логика выделения диапазона
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionCarId, setSelectionCarId] = useState<string | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{carId: string, dayIndex: number} | null>(null);
  
  const getPhantomRange = () => {
    if (!isSelecting || !selectionCarId || selectionStart === null || selectionEnd === null) return null;
    const min = Math.min(selectionStart, selectionEnd);
    const max = Math.max(selectionStart, selectionEnd);
    return { carId: selectionCarId, start: min, end: max };
  };
  const phantomRange = getPhantomRange();

  // 📅 Даты: 7 дней назад от startDate + 3 месяца вперёд
  const actualStartDate = useMemo(() => subDays(startDate, 7), [startDate]);
  
  const dates = useMemo(() => {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(actualStartDate, i));
  }, [actualStartDate]);

  // ✅ Автоскролл к сегодняшней дате при загрузке
  useEffect(() => {
    if (scrollRef.current) {
      const today = new Date();
      const todayIndex = dates.findIndex(date => isSameDay(date, today));
      
      if (todayIndex !== -1) {
        // Скроллим к сегодня минус несколько дней для контекста
        const scrollPosition = Math.max(0, (todayIndex - 5) * DAY_WIDTH);
        scrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [dates]);

  const bookingsByCarId = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      const carId = booking.form_data.car.id;
      if (!map.has(carId)) map.set(carId, []);
      map.get(carId)!.push(booking);
    });
    return map;
  }, [bookings]);

  const getBookingPosition = (booking: Booking) => {
    const bookingStart = startOfDay(new Date(booking.form_data.dates.start));
    const bookingEnd = startOfDay(new Date(booking.form_data.dates.end));
    const viewStart = actualStartDate;
    const viewEnd = addDays(actualStartDate, TOTAL_DAYS - 1);

    if (bookingEnd < viewStart || bookingStart > viewEnd) return null;

    const startOffset = Math.max(0, differenceInDays(bookingStart, viewStart));
    const endOffset = Math.min(TOTAL_DAYS - 1, differenceInDays(bookingEnd, viewStart));
    
    const left = startOffset * DAY_WIDTH;
    const width = (endOffset - startOffset + 1) * DAY_WIDTH - 2;

    return { left, width };
  };

  // ✅ Touch handlers для выделения диапазона
  const handleCellTouchStart = useCallback((carId: string, dayIndex: number, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectionCarId(carId);
    setSelectionStart(dayIndex);
    setSelectionEnd(dayIndex);
  }, []);

  const handleCellTouchMove = useCallback((dayIndex: number) => {
    if (isSelecting && selectionStart !== null) {
      setSelectionEnd(dayIndex);
    }
  }, [isSelecting, selectionStart]);

  const handleCellTouchEnd = useCallback(() => {
    if (isSelecting && selectionCarId && selectionStart !== null && selectionEnd !== null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      onCreateBooking(selectionCarId, {
        start: dates[start],
        end: dates[end]
      });
      setTimeout(() => {
        setIsSelecting(false);
        setSelectionCarId(null);
        setSelectionStart(null);
        setSelectionEnd(null);
      }, 100);
      return;
    }
    setIsSelecting(false);
    setSelectionCarId(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionCarId, selectionStart, selectionEnd, dates, onCreateBooking]);

  const isInSelection = (carId: string, dayIndex: number) => {
    if (!isSelecting || selectionCarId !== carId || selectionStart === null || selectionEnd === null) {
      return false;
    }
    const min = Math.min(selectionStart, selectionEnd);
    const max = Math.max(selectionStart, selectionEnd);
    return dayIndex >= min && dayIndex <= max;
  };
  
  // ✅ ТОЛЬКО двойной клик открывает модалку
  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const now = Date.now();
    if (lastBookingTap && lastBookingTap.bookingId === booking.booking_id 
        && (now - lastBookingTap.timestamp) < DOUBLE_TAP_DELAY) {
      // Второй клик - открываем модалку
      onBookingClick(booking);
      setLastBookingTap(null);
    } else {
      // Первый клик - просто сохраняем
      setLastBookingTap({ bookingId: booking.booking_id, timestamp: now });
    }
  };

  const totalWidth = TOTAL_DAYS * DAY_WIDTH;

  // 🎯 ФОРМАТ БЕЙДЖА - 2 строки
  const formatBookingBadge = (booking: Booking) => {
    const fd = booking.form_data;
    const start = new Date(fd.dates.start);
    const end = new Date(fd.dates.end);
    
    const startStr = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}`;
    const pickupTime = format(start, 'HH:mm');
    
    const line1Parts = [];
    line1Parts.push(`${startStr}-${endStr}`);
    line1Parts.push(pickupTime);
    if (fd.locations?.pickupLocation) line1Parts.push(fd.locations.pickupLocation);
    line1Parts.push(fd.car.name || `${fd.car.brand} ${fd.car.model}`);
    
    const line2Parts = [];
    if (fd.contact?.name) line2Parts.push(fd.contact.name);
    if (fd.contact?.value) line2Parts.push(fd.contact.value);
    
    return {
      line1: line1Parts.join(' • '),
      line2: line2Parts.join(' • ')
    };
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ height: 'calc(100vh - 60px)' }}
        onMouseUp={() => isSelecting && handleCellTouchEnd()}
        onMouseLeave={() => isSelecting && handleCellTouchEnd()}
      >
        <div style={{ width: totalWidth + SIDEBAR_WIDTH }}>
          {/* Header dates */}
          <div className="sticky top-0 z-20 flex bg-white border-b border-gray-300 shadow-md">
            {/* Sidebar header */}
            <div 
              className="sticky left-0 z-30 flex-shrink-0 border-r border-gray-300 px-1 flex items-center justify-center bg-white shadow-sm"
              style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT }}
            >
              <span className="text-[9px] font-bold text-gray-600">Авто</span>
            </div>
            
            {/* Date cells */}
            <div className="flex">
              {dates.map((date, i) => {
                const isToday = isSameDay(date, new Date());
                const isFirstOfMonth = date.getDate() === 1;
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-200 border-r border-gray-300/30",
                      isToday && "bg-blue-100 font-bold"
                    )}
                    style={{ 
                      width: DAY_WIDTH, 
                      height: HEADER_HEIGHT
                    }}
                  >
                    {isFirstOfMonth && (
                      <span className="absolute top-0 text-[7px] font-bold text-orange-600">
                        {format(date, 'MMM', { locale: ru })}
                      </span>
                    )}
                    <span className={cn(
                      "text-[8px] uppercase",
                      isToday ? "text-blue-700 font-bold" : "text-gray-500"
                    )}>
                      {format(date, 'EEEEEE', { locale: ru })}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold",
                      isToday ? "text-blue-700" : "text-gray-700"
                    )}>
                      {format(date, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Car rows */}
          {cars.map((car) => {
            const carBookings = bookingsByCarId.get(car.id) || [];
            const ownerBadge = carOwnersMap[car.id];
            
            return (
              <div 
                key={car.id}
                className="flex border-b border-gray-300/30"
                style={{ height: CAR_ROW_HEIGHT }}
              >
                {/* Sidebar - только фото + название */}
                <div
                  className="sticky left-0 z-10 flex-shrink-0 flex flex-col items-center justify-center px-1 py-0.5 border-r border-gray-300 bg-white shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ width: SIDEBAR_WIDTH }}
                  onClick={() => {
                    setSelectedCarInfo({ car, owner: ownerBadge || null });
                  }}
                >
                  {/* Фото - чистое, без бейджа */}
                  <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-200">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: car.photos?.main ? `url(${getPhotoUrl(car.photos.main)})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                  </div>
                  
                  {/* Текст под фото - марка и модель */}
                  <div className="w-full text-center mt-0.5">
                    <div className="text-[7px] font-bold text-gray-900 leading-none truncate">
                      {car.brand} {car.model}
                    </div>
                  </div>
                </div>

                {/* Calendar cells */}
                <div className="flex-1 relative" style={{ height: CAR_ROW_HEIGHT }}>
                  {/* Day cells */}
                  <div className="absolute inset-0 flex">
                    {dates.map((date, i) => {
                      const monthBg = MONTH_COLORS[date.getMonth()];
                      const isToday = isSameDay(date, new Date());
                      const isSelected = isInSelection(car.id, i);
                      const isPhantomRange = phantomRange && car.id === phantomRange.carId && i >= phantomRange.start && i <= phantomRange.end;
                      const isHovered = !isSelected && !isPhantomRange && hoveredBooking === null && hoveredCell?.carId === car.id && hoveredCell?.dayIndex === i;
                      
                      return (
                        <div
                          key={i}
                          className={cn(
                            "transition-colors border-r border-gray-300/30",
                            isToday && "bg-blue-100/50",
                            isSelected && "bg-orange-300/50",
                            isPhantomRange && "bg-orange-200/50",
                            isHovered && "bg-orange-100/30"
                          )}
                          style={{ 
                            width: DAY_WIDTH, 
                            height: '100%',
                            backgroundColor: (!isToday && !isSelected && !isPhantomRange && !isHovered ? monthBg : undefined)
                          }}
                          onMouseDown={(e) => handleCellTouchStart(car.id, i, e)}
                          onMouseUp={handleCellTouchEnd}
                          onMouseEnter={() => { handleCellTouchMove(i); setHoveredCell({ carId: car.id, dayIndex: i }); }}
                          onMouseLeave={() => setHoveredCell(null)}
                          onTouchStart={(e) => handleCellTouchStart(car.id, i, e)}
                          onTouchEnd={handleCellTouchEnd}
                        />
                      );
                    })}
                  </div>

                  {/* Booking bars */}
                  <div className="absolute inset-0 pointer-events-none">
                    {carBookings.map((booking) => {
                      const position = getBookingPosition(booking);
                      if (!position) return null;
                      
                      const badgeData = formatBookingBadge(booking);
                      const bgColor = booking.status === 'confirmed' ? '#86efac' : '#fde047';
                      
                      return (
                        <div
                          key={booking.booking_id}
                          className={cn(
                            "absolute top-[1px] bottom-[1px] pointer-events-auto cursor-pointer transition-all",
                            hoveredBooking === booking.booking_id && "ring-1 ring-blue-400 z-10"
                          )}
                          style={{
                            left: position.left + 1,
                            width: position.width,
                            backgroundColor: bgColor,
                          }}
                          onClick={(e) => handleBookingClick(booking, e)}
                          onMouseEnter={() => setHoveredBooking(booking.booking_id)}
                          onMouseLeave={() => setHoveredBooking(null)}
                        >
                          <div className="px-0.5 h-full flex flex-col justify-center overflow-hidden leading-tight">
                            <div className="text-[7px] font-semibold text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                              {badgeData.line1}
                            </div>
                            <div className="text-[7px] font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">
                              {badgeData.line2}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Диалог с инфо о машине */}
      {selectedCarInfo && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCarInfo(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фото */}
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-200 mb-4">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: selectedCarInfo.car.photos?.main 
                    ? `url(${getPhotoUrl(selectedCarInfo.car.photos.main)})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            </div>

            {/* Инфо */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedCarInfo.car.brand} {selectedCarInfo.car.model}
                </h3>
                <p className="text-sm text-gray-600">{selectedCarInfo.car.year}</p>
              </div>

              {selectedCarInfo.owner && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  <div>
                    <p className="text-xs text-gray-600">Владелец</p>
                    <p className="text-sm font-semibold text-purple-700">{selectedCarInfo.owner}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedCarInfo(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarGrid;
