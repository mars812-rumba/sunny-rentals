import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfDay, startOfMonth } from 'date-fns';
import { Calendar, Filter, LayoutGrid, List } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { MonthCalendarView } from '@/components/admin/MonthCalendarView';
import { BookingFormModal } from '@/components/admin/BookingFormModal';
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
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [initialDateRange, setInitialDateRange] = useState<{ start: Date; end: Date } | undefined>();

  // ✅ Состояние для отслеживания двойного клика
  const [lastTap, setLastTap] = useState<{
    id: string;
    timestamp: number;
  } | null>(null);

  // Fetch data
  const { data: cars = [], isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['admin-cars'],
    queryFn: () => fetchCars(),
  });

  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => fetchBookings(),
  });

  // Fetch car owners map
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

  // Клик по существующей броне (открываем сразу)
  const handleBookingClick = (booking: Booking) => {
    const car = cars.find(c => c.id === booking.form_data.car.id);
    if (car) {
      setSelectedCar(car);
      setSelectedBooking(booking);
      setIsModalOpen(true);
    }
  };

  // ✅ Создание брони в режиме Ганта (Двойной клик)
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

  // ✅ Клик по дню в режиме Месяца (Двойной клик)
  const handleDayClick = (date: Date) => {
    const now = Date.now();
    const tapId = `month-${date.getTime()}`;

    if (lastTap && lastTap.id === tapId && (now - lastTap.timestamp) < DOUBLE_TAP_DELAY) {
      setSelectedCar(null);
      setSelectedBooking(null);
      setInitialDateRange({ start: date, end: date });
      setIsModalOpen(true);
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
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-bg-gray-100" />
            <span className="text-sm font-semibold text-bg-gray-100">Календарь</span>
            <span className="text-[9px] text-bg-gray-100 uppercase tracking-wider">(2x click to create)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-bg-gray-100 rounded-md p-0.5">
              <Button
                variant="ghost" size="sm"
                onClick={() => setViewMode('month')}
                className={`h-7 px-2 text-xs ${viewMode === 'month' ? 'bg-[hsl(200,80%,55%)] text-white' : 'text-[hsl(220,8%,55%)]'}`}
              >
                <LayoutGrid className="h-3 w-3 mr-1" /> Месяц
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setViewMode('gantt')}
                className={`h-7 px-2 text-xs ${viewMode === 'gantt' ? 'bg-[hsl(200,80%,55%)] text-white' : 'text-[hsl(220,8%,55%)]'}`}
              >
                <List className="h-3 w-3 mr-1" /> Ганта
              </Button>
            </div>

            {viewMode === 'gantt' && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-28 h-8 text-xs bg-bg-gray-100 border-bg-gray-100/60 text-[hsl(220,10%,92%)]">
                  <Filter className="h-3 w-3 mr-1 opacity-50" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-gray-100 border-[hsla(219, 37.40%, 80.60%, 0.74)]/50">
                  {CAR_CLASSES.map(cls => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs text-[hsl(220,10%,92%)]">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <main className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[hsl(200,80%,55%)] border-t-transparent" />
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
    </div>
  );
}