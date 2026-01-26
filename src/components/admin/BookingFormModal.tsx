import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, MapPin, User, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Car, 
  Booking, 
  BookingFormData,
  PICKUP_LOCATIONS, 
  submitBooking,
  deleteBooking,
  calculateBookingPricing, 
  generateTimeOptions
} from '@/api/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car | null;
  booking?: Booking | null;
  initialDateRange?: { start: Date; end: Date };
  onSuccess: () => void;
}

export function BookingFormModal({
  isOpen,
  onClose,
  car,
  booking,
  initialDateRange,
  onSuccess,
}: BookingFormModalProps) {
  const isEditing = !!booking;
  
  // Form state
  const [startDate, setStartDate] = useState<Date | undefined>(initialDateRange?.start || new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(initialDateRange?.end || addDays(initialDateRange?.start || new Date(), 3));
  const [pickupTime, setPickupTime] = useState('13:00');
  const [returnTime, setReturnTime] = useState('13:00');
  const [pickupLocation, setPickupLocation] = useState('airport');
  const [returnLocation, setReturnLocation] = useState('airport');
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnAddress, setReturnAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (booking) {
      const formData = booking.form_data;
      const start = new Date(formData.dates.start);
      const end = new Date(formData.dates.end);
      
      setStartDate(start);
      setEndDate(end);
      setPickupTime(format(start, 'HH:mm'));
      setReturnTime(format(end, 'HH:mm'));

      setReturnLocation(formData?.locations?.returnLocation || 'airport');
      setPickupLocation(formData?.locations?.pickupLocation || 'airport');  
      setPickupAddress(formData?.locations?.pickupAddress || '');
      setReturnAddress(formData?.locations?.returnAddress || '');

      setCustomerName(formData.contact.name || '');
      setCustomerPhone(formData.contact.phone || '');
      
      const contactValue = formData.contact.value || '';
      if (formData.contact.type === 'telegram') {
        setCustomerTelegram(contactValue);
        setCustomerWhatsapp('');
      } else if (formData.contact.type === 'whatsapp') {
        setCustomerWhatsapp(contactValue);
        setCustomerTelegram('');
      } else {
        setCustomerTelegram('');
        setCustomerWhatsapp('');
      }
    } else if (initialDateRange) {
      setStartDate(initialDateRange.start);
      setEndDate(initialDateRange.end);
    } else {
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 3));
    }
  }, [booking, initialDateRange]);

  const resetForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPickupTime('13:00');
    setReturnTime('13:00');
    setPickupLocation('airport');
    setReturnLocation('airport');
    setPickupAddress('');
    setReturnAddress('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerTelegram('');
    setCustomerWhatsapp('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pricing = useMemo(() => {
    if (!car || !startDate || !endDate) return null;
    return calculateBookingPricing(car, startDate, endDate, pickupLocation, returnLocation);
  }, [car, startDate, endDate, pickupLocation, returnLocation]);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const handleSubmit = async () => {
    if (!car || !startDate || !endDate || !pricing) {
      toast.error('Заполните основные поля');
      return;
    }
    
    if (!pickupLocation || !returnLocation) {
      toast.error('Выберите место получения и возврата');
      return;
    }
    
    if (!customerName || (!customerTelegram && !customerWhatsapp && !customerPhone)) {
      toast.error('Заполните данные клиента');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = parse(pickupTime, 'HH:mm', startDate);
      const endDateTime = parse(returnTime, 'HH:mm', endDate);

      const formData: BookingFormData = {
        car: {
          id: car.id,
          name: car.name,
          brand: car.brand,
          model: car.model,
          year: car.year,
          color: car.color,
        },
        dates: {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          days: pricing.days,
        },
        locations: {
          pickupLocation: pickupLocation,
          returnLocation: returnLocation,
          pickupAddress: pickupAddress,
          returnAddress: returnAddress,
        },
        pricing: {
          dailyRate: pricing.dailyRate,
          totalRental: pricing.totalRental,
          deposit: pricing.deposit,
          deliveryPickup: pricing.deliveryPickup,
          deliveryReturn: pricing.deliveryReturn,
          totalDelivery: pricing.totalDelivery,
          grandTotal: pricing.grandTotal,
        },
        contact: {
          value: customerTelegram || customerWhatsapp || customerPhone,
          type: customerTelegram ? 'telegram' : customerWhatsapp ? 'whatsapp' : 'phone',
          name: customerName,
          phone: customerPhone,
        },
        timestamp: new Date().toISOString(),
      };

      await submitBooking(formData, booking?.booking_id);

      toast.success(isEditing ? 'Бронь обновлена' : 'Бронь создана');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit booking:', error);
      toast.error(error.message || 'Ошибка при сохранении');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!booking || !window.confirm('Удалить бронь?')) return;
    
    setIsSubmitting(true);
    try {
      await deleteBooking(booking.booking_id);
      toast.success('Бронь удалена');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to delete booking:', error);
      toast.error(error.message || 'Ошибка при удалении');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!car) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-3xl shadow-xl">
        {/* Header - светлый стиль */}
        <div className="sticky top-0 z-10 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {car.brand} {car.model}
              </h3>
              <p className="text-xs text-slate-500">
                {car.year} • {car.color}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Получение</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 text-xs px-3 bg-white border-slate-200 text-slate-700 justify-start hover:bg-slate-50 hover:border-blue-300"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-2 text-slate-500" />
                    {startDate ? format(startDate, 'd MMM', { locale: ru }) : 'Дата'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-slate-200 shadow-lg" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ru}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Возврат</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-9 text-xs px-3 bg-white border-slate-200 text-slate-700 justify-start hover:bg-slate-50 hover:border-blue-300"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-2 text-slate-500" />
                    {endDate ? format(endDate, 'd MMM', { locale: ru }) : 'Дата'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-slate-200 shadow-lg" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ru}
                    disabled={(date) => startDate ? date < startDate : false}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <Select value={pickupTime} onValueChange={setPickupTime}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200 text-slate-700 hover:border-blue-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time} className="text-xs text-slate-700 hover:bg-slate-50">{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={returnTime} onValueChange={setReturnTime}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200 text-slate-700 hover:border-blue-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time} className="text-xs text-slate-700 hover:bg-slate-50">{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-2 gap-3">
            <Select value={pickupLocation} onValueChange={setPickupLocation}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200 text-slate-700 hover:border-blue-300">
                <MapPin className="h-3.5 w-3.5 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg">
                {PICKUP_LOCATIONS.map(loc => (
                  <SelectItem key={loc.id} value={loc.id} className="text-xs text-slate-700 hover:bg-slate-50">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={returnLocation} onValueChange={setReturnLocation}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200 text-slate-700 hover:border-blue-300">
                <MapPin className="h-3.5 w-3.5 mr-2 text-slate-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg">
                {PICKUP_LOCATIONS.map(loc => (
                  <SelectItem key={loc.id} value={loc.id} className="text-xs text-slate-700 hover:bg-slate-50">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-3">
            <Input 
              placeholder="Адрес получения"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="h-9 text-xs bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
            />
            <Input 
              placeholder="Адрес возврата"
              value={returnAddress}
              onChange={(e) => setReturnAddress(e.target.value)}
              className="h-9 text-xs bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <Input 
              placeholder="Имя клиента"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-9 text-xs bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
            />
            <Input 
              placeholder="@telegram или +телефон"
              value={customerTelegram || customerWhatsapp || customerPhone}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith('@')) {
                  setCustomerTelegram(value);
                  setCustomerWhatsapp('');
                  setCustomerPhone('');
                } else if (value.startsWith('+')) {
                  setCustomerPhone(value);
                  setCustomerTelegram('');
                  setCustomerWhatsapp('');
                } else {
                  setCustomerWhatsapp(value);
                  setCustomerTelegram('');
                  setCustomerPhone('');
                }
              }}
              className="h-9 text-xs bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>

          {/* Pricing - светлый стиль */}
          {pricing && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">
                  {pricing.days} дн. × {pricing.dailyRate}฿
                  {pricing.highSeason && <span className="ml-1 text-amber-600 font-semibold">(HS)</span>}
                </span>
                <span className="text-slate-800 font-semibold">{pricing.totalRental.toLocaleString()}฿</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Доставка</span>
                <span className="text-slate-800 font-semibold">{pricing.totalDelivery}฿</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-800">Итого</span>
                <span className="text-blue-600">{pricing.grandTotal.toLocaleString()}฿</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Залог</span>
                <span>{pricing.deposit.toLocaleString()}฿</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1 h-10 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md"
              onClick={handleSubmit}
              disabled={isSubmitting || !pricing}
            >
              {isSubmitting ? 'Сохранение...' : isEditing ? 'Обновить бронь' : 'Создать бронь'}
            </Button>
            {isEditing && (
              <Button
                variant="destructive"
                className="h-10 px-4 bg-red-600 hover:bg-red-700 shadow-md"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}