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
      <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(220,18%,14%)] border border-[hsl(220,12%,22%)]/50 text-[hsl(220,10%,92%)] p-0">
        {/* Header - тёмный */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[hsl(220,12%,22%)]/50 bg-[hsl(220,18%,16%)]">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-[hsl(200,80%,55%)]">
              {car.brand} {car.model}
            </div>
            <div className="text-[9px] text-[hsl(220,8%,60%)]">
              {car.year} • {car.color}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[hsl(220,8%,60%)] hover:text-[hsl(220,10%,92%)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form - тёмный стиль */}
        <div className="px-4 py-3 space-y-3">
          {/* Dates row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-[hsl(220,8%,60%)] mb-1 block font-medium">Получение</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-8 text-[10px] px-2 bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] justify-start hover:bg-[hsl(220,18%,18%)] hover:border-[hsl(200,80%,55%)]/50"
                  >
                    <Calendar className="h-3 w-3 mr-1 text-[hsl(220,8%,60%)]" />
                    {startDate ? format(startDate, 'd MMM', { locale: ru }) : 'Дата'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50" align="start">
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
              <label className="text-[9px] text-[hsl(220,8%,60%)] mb-1 block font-medium">Возврат</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-8 text-[10px] px-2 bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] justify-start hover:bg-[hsl(220,18%,18%)] hover:border-[hsl(200,80%,55%)]/50"
                  >
                    <Calendar className="h-3 w-3 mr-1 text-[hsl(220,8%,60%)]" />
                    {endDate ? format(endDate, 'd MMM', { locale: ru }) : 'Дата'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50" align="start">
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

          {/* Time row */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={pickupTime} onValueChange={setPickupTime}>
              <SelectTrigger className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] hover:border-[hsl(200,80%,55%)]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50 max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time} className="text-[10px] text-[hsl(220,10%,92%)]">{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={returnTime} onValueChange={setReturnTime}>
              <SelectTrigger className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] hover:border-[hsl(200,80%,55%)]/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50 max-h-48">
                {timeOptions.map(time => (
                  <SelectItem key={time} value={time} className="text-[10px] text-[hsl(220,10%,92%)]">{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locations row */}
          <div className="grid grid-cols-2 gap-2">
            <Select value={pickupLocation} onValueChange={setPickupLocation}>
              <SelectTrigger className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] hover:border-[hsl(200,80%,55%)]/50">
                <MapPin className="h-3 w-3 mr-1 text-[hsl(220,8%,60%)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50">
                {PICKUP_LOCATIONS.map(loc => (
                  <SelectItem key={loc.id} value={loc.id} className="text-[10px] text-[hsl(220,10%,92%)]">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={returnLocation} onValueChange={setReturnLocation}>
              <SelectTrigger className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] hover:border-[hsl(200,80%,55%)]/50">
                <MapPin className="h-3 w-3 mr-1 text-[hsl(220,8%,60%)]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,14%)] border-[hsl(220,12%,22%)]/50">
                {PICKUP_LOCATIONS.map(loc => (
                  <SelectItem key={loc.id} value={loc.id} className="text-[10px] text-[hsl(220,10%,92%)]">{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Addresses row */}
          <div className="grid grid-cols-2 gap-2">
            <Input 
              placeholder="Адрес получения"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] placeholder:text-[hsl(220,8%,45%)] focus:border-[hsl(200,80%,55%)]/50 focus:ring-[hsl(200,80%,55%)]/30"
            />
            <Input 
              placeholder="Адрес возврата"
              value={returnAddress}
              onChange={(e) => setReturnAddress(e.target.value)}
              className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] placeholder:text-[hsl(220,8%,45%)] focus:border-[hsl(200,80%,55%)]/50 focus:ring-[hsl(200,80%,55%)]/30"
            />
          </div>

          {/* Customer row */}
          <div className="grid grid-cols-2 gap-2">
            <Input 
              placeholder="Имя"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] placeholder:text-[hsl(220,8%,45%)] focus:border-[hsl(200,80%,55%)]/50 focus:ring-[hsl(200,80%,55%)]/30"
            />
            <Input 
              placeholder="TG / WA / телефон"
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
              className="h-8 text-[10px] bg-[hsl(220,18%,12%)] border-[hsl(220,12%,22%)]/60 text-[hsl(220,10%,92%)] placeholder:text-[hsl(220,8%,45%)] focus:border-[hsl(200,80%,55%)]/50 focus:ring-[hsl(200,80%,55%)]/30"
            />
          </div>

          {/* Pricing summary - тёмный градиент */}
          {pricing && (
            <div className="bg-gradient-to-br from-[hsl(220,18%,18%)] to-[hsl(220,18%,16%)] rounded-md p-2 space-y-1 border border-[hsl(220,12%,22%)]/50">
              <div className="flex justify-between text-[9px]">
                <span className="text-[hsl(220,8%,60%)]">
                  {pricing.days} дн. × {pricing.dailyRate}฿
                  {pricing.highSeason && <span className="ml-1 text-[hsl(45,100%,60%)] font-semibold">(HS)</span>}
                </span>
                <span className="text-[hsl(220,10%,92%)] font-medium">{pricing.totalRental.toLocaleString()}฿</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-[hsl(220,8%,60%)]">Доставка</span>
                <span className="text-[hsl(220,10%,92%)] font-medium">{pricing.totalDelivery}฿</span>
              </div>
              <div className="flex justify-between text-[10px] font-semibold pt-1 border-t border-[hsl(220,12%,22%)]/50">
                <span className="text-[hsl(220,10%,92%)]">Итого</span>
                <span className="text-[hsl(200,80%,55%)]">{pricing.grandTotal.toLocaleString()}฿</span>
              </div>
              <div className="flex justify-between text-[9px] text-[hsl(220,8%,60%)]">
                <span>Залог</span>
                <span>{pricing.deposit.toLocaleString()}฿</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button 
              className="flex-1 h-9 text-[11px] font-medium text-white bg-gradient-to-r from-[hsl(200,80%,50%)] to-[hsl(200,80%,60%)] shadow-md hover:from-[hsl(200,80%,45%)] hover:to-[hsl(200,80%,55%)]"
              onClick={handleSubmit}
              disabled={isSubmitting || !pricing}
            >
              {isSubmitting ? 'Сохр...' : isEditing ? 'Обновить' : 'Создать'}
            </Button>
            {isEditing && (
              <Button
                variant="destructive"
                className="h-9 px-3 bg-[hsl(0,70%,45%)] hover:bg-[hsl(0,70%,40%)]"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}