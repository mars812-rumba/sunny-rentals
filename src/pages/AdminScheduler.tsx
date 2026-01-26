import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay, startOfMonth } from 'date-fns';
import { Calendar, Filter, LayoutGrid, List, ZoomIn, ZoomOut } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { MonthCalendarView } from '@/components/admin/MonthCalendarView';
import { BookingFormModal } from '@/components/admin/BookingFormModal';
import { DayDetailsModal } from '@/components/admin/DayDetailsModal';
import { fetchCars, fetchBookings, fetchCarOwners, Car, Booking } from '@/api/api.ts';

const CAR_CLASSES = [
  { id: 'all', name: 'Все' },
  { id: 'compact', name: 'Компакт' },
  { id: 'sedan', name: 'Седан' },
  { id: 'suv', name: 'SUV' },
  { id: '7s', name: '7 мест' },
  { id: 'bikes', name: 'Байки' },
];

type ViewMode = 'month' | 'gantt';
const DOUBLE_TAP_DELAY = 300;

export default function AdminScheduler() {
  const [currentDate, setCurrentDate] = useState<Date>(startOfMonth(new Date()));
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [daysToShow, setDaysToShow] = useState(30);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [carOwnersMap, setCarOwnersMap] = useState<Record<string, string>>({});
  const [isCompactMode, setIsCompactMode] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [initialDateRange, setInitialDateRange] = useState<{ start: Date; end: Date } | undefined>();

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);

  const [lastTap, setLastTap] = useState<{
    id: string;
    timestamp: number;
  } | null>(null);

  const { data: cars = [], isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: () => fetchCars(),
  });

  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => fetchBookings(),
  });

  useEffect(() => {
    fetchCarOwners().then(setCarOwnersMap);
  }, []);

  const filteredCars = cars.filter(car => {
    if (selectedClass === 'all') return true;
    return car.class === selectedClass;
  });

  const filteredBookings = bookings.filter(booking => {
    if (selectedClass === 'all') return true;
    const car = cars.find(c => c.id === booking.form_data.car.id);
    return car?.class === selectedClass;
  });

  const handleBookingClick = (booking: Booking) => {
    const car = cars.find(c => c.id === booking.form_data.car.id);
    if (car) {
      setSelectedCar(car);
      setSelectedBooking(booking);
      setIsModalOpen(true);
    }
  };

  const handleCreateBooking = (carId: string, dateRange: { start: Date; end: Date }) => {
    const now = Date.now();
    const tapId = `gantt-${carId}-${dateRange.start.getTime()}`;

    if (lastTap && lastTap.id === tapId && (now - lastTap.timestamp) < DOUBLE_TAP_DELAY) {
      const car = cars.find(c => c.id === carId);
      if (car) {
        setSelectedCar(car);
        setSelectedBooking(null);
        setInitialDateRange(dateRange);
        setIsModalOpen(true);
      }
      setLastTap(null);
    } else {
      setLastTap({ id: tapId, timestamp: now });
    }
  };

  const handleDayClick = (date: Date, events: any[]) => {
    const now = Date.now();
    const tapId = `month-${date.getTime()}`;

    if (lastTap && lastTap.id === tapId && (now - lastTap.timestamp) < DOUBLE_TAP_DELAY) {
      if (events.length > 0) {
        setSelectedDate(date);
        setSelectedDayEvents(events);
        setIsDayModalOpen(true);
      } else {
        setSelectedCar(null);
        setSelectedBooking(null);
        setInitialDateRange({ start: date, end: date });
        setIsModalOpen(true);
      }
      setLastTap(null);
    } else {
      setLastTap({ id: tapId, timestamp: now });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCar(null);
    setSelectedBooking(null);
    setInitialDateRange(undefined);
  };

  const handleDayModalClose = () => {
    setIsDayModalOpen(false);
    setSelectedDate(null);
    setSelectedDayEvents([]);
  };

  const handleBookingSuccess = () => {
    refetchBookings();
    refetchCars();
  };

  useEffect(() => {
    const updateDaysToShow = () => {
      const width = window.innerWidth;
      setDaysToShow(width < 768 ? 14 : 30);
    };
    updateDaysToShow();
    window.addEventListener('resize', updateDaysToShow);
    return () => window.removeEventListener('resize', updateDaysToShow);
  }, []);

  const isLoading = carsLoading || bookingsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - НЕПРОЗРАЧНЫЙ с тенью */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 py-2 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Календарь</span>
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === 'gantt' && (
              <>
                {/* Фильтр - НЕПРОЗРАЧНЫЙ */}
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-24 h-7 text-xs bg-white border-gray-300 text-gray-900 font-medium">
                    <Filter className="h-3 w-3 mr-1 text-gray-700" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg">
                    {CAR_CLASSES.map(cls => (
                      <SelectItem 
                        key={cls.id} 
                        value={cls.id} 
                        className="text-xs text-gray-900 hover:bg-gray-100 cursor-pointer"
                      >
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Кнопка компактного режима */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCompactMode(!isCompactMode)}
                  className="h-7 w-7 p-0 bg-white border-gray-300"
                  title={isCompactMode ? "Показать фото" : "Скрыть фото"}
                >
                  {isCompactMode ? (
                    <ZoomIn className="h-3.5 w-3.5 text-gray-700" />
                  ) : (
                    <ZoomOut className="h-3.5 w-3.5 text-gray-700" />
                  )}
                </Button>
              </>
            )}

            {/* Переключатель вида */}
            <div className="flex bg-gray-100 rounded-md p-0.5">
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setViewMode('month')}
                className={`h-7 px-2 text-xs font-medium ${
                  viewMode === 'month' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3 w-3 mr-1" /> 
              </Button>
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setViewMode('gantt')}
                className={`h-7 px-2 text-xs font-medium ${
                  viewMode === 'gantt' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-3 w-3 mr-1" /> 
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : viewMode === 'month' ? (
          <MonthCalendarView
            currentDate={currentDate}
            bookings={filteredBookings}
            onDateChange={setCurrentDate}
            onBookingClick={handleBookingClick}
            onDayClick={handleDayClick}
          />
        ) : (
          <SchedulerCalendar
            cars={filteredCars}
            bookings={bookings}
            startDate={startDate}
            daysToShow={daysToShow}
            onDateChange={setStartDate}
            onBookingClick={handleBookingClick}
            onCreateBooking={handleCreateBooking}
            selectedClass={selectedClass}
            carOwnersMap={carOwnersMap}
            isCompactMode={isCompactMode}
          />
        )}
      </main>

      <BookingFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        car={selectedCar}
        booking={selectedBooking}
        initialDateRange={initialDateRange}
        onSuccess={handleBookingSuccess}
      />

      <DayDetailsModal
        isOpen={isDayModalOpen}
        onClose={handleDayModalClose}
        date={selectedDate}
        events={selectedDayEvents}
        onBookingClick={handleBookingClick}
      />
    </div>
  );
}