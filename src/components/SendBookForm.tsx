import React, { useState, useEffect } from 'react';
import { Car, Calendar, MapPin, CreditCard, CheckCircle, MessageCircleWarning, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLeadEvent, submitBooking } from '@/api/api';

// --- Helper functions ---
const determineSeason = (startDate: Date) => {
  const month = startDate.getMonth() + 1;
  return month >= 11 || month <= 4 ? 'high_season' : 'low_season';
};

const getPriceForPeriod = (pricing: any, days: number, startDate?: Date) => {
  const season = startDate ? determineSeason(startDate) : 'low_season';
  if (days >= 30) return pricing[season].price_30;
  if (days >= 15) return pricing[season].price_15_29;
  if (days >= 7) return pricing[season].price_7_14;
  return pricing[season].price_1_6;
};

const getDeliveryPrice = (location: string) => {
  return location === 'airport' ? 0 : 500;
};

const BookingConfirmationContent = ({ 
  car, 
  filters, 
  onClose, 
  onBookingSubmit, 
  isSubmitting, 
  requireWhatsApp 
}: {
  car: any;
  filters: any;
  onClose: () => void;
  onBookingSubmit: (contact: { value: string; type: string }) => void;
  isSubmitting: boolean;
  requireWhatsApp: boolean;
}) => {
  const { t } = useLanguage();
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');

  const dailyPrice = getPriceForPeriod(car.pricing, filters.days, filters.startDate);
  const totalRentalPrice = dailyPrice * filters.days;
  const pickupDelivery = getDeliveryPrice(filters.pickupLocation);
  const returnDelivery = getDeliveryPrice(filters.returnLocation);
  const totalDelivery = pickupDelivery + returnDelivery;
  const grandTotal = totalRentalPrice + totalDelivery;

  const handleBooking = () => {
    if (requireWhatsApp) {
      if (!whatsapp.trim()) {
        setError(t('whatsapp_error_required'));
        return;
      }
      if (!/^[\d\s\-\+\(\)]+$/.test(whatsapp)) {
        setError(t('whatsapp_error_invalid'));
        return;
      }
      setError('');
      onBookingSubmit({ value: whatsapp, type: 'whatsapp' });
    } else {
      // @ts-ignore
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      onBookingSubmit({ value: `@${user.username}`, type: 'telegram' });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-24 h-16 bg-muted rounded overflow-hidden">
          <img
            src={`/images_web/${car.photos.main}`}
            alt={car.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{car.brand} {car.model}</h4>
          <p className="text-sm text-muted-foreground">{car.year} • {car.color}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('rental_dates_label')}</span>
            <span className="font-medium">{format(filters.startDate, 'd MMM', { locale: ru })} - {format(filters.endDate, 'd MMM', { locale: ru })} ({t('days_short', { days: filters.days })})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('delivery_and_return')}</span>
            <span className="font-medium">{filters.pickupLocation} / {filters.returnLocation}</span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('total_payment_label')}</span>
              <span className="font-semibold text-primary">฿{grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('deposit')}</span>
              <span>฿{car.pricing.deposit.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {requireWhatsApp && (
        <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-amber-600">
                <MessageCircleWarning className="w-5 h-5"/>
                <h4 className="font-semibold">{t('whatsapp_title')}</h4>
            </div>
          <p className="text-xs text-muted-foreground -mt-1">{t('whatsapp_description')}</p>
          <Input
            id="whatsapp"
            placeholder={t('whatsapp_placeholder')}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onClose} className="w-full" disabled={isSubmitting}>
          {t('cancel')}
        </Button>
        <Button 
          onClick={handleBooking} 
          className="w-full bg-green-500 hover:bg-green-600 text-white" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('sending')}
            </>
          ) : (
            requireWhatsApp ? t('submit') : t('book')
          )}
        </Button>
      </div>
    </div>
  );
};

const ThankYouContent = ({ car, onClose }: { car: any; onClose: () => void }) => {
  const { t } = useLanguage();
  
  const handleCloseWebApp = () => {
    try {
      // @ts-ignore
      window.Telegram.WebApp.close();
    } catch (e) {
      console.error("Failed to close Telegram Web App:", e);
      onClose(); // Fallback for browsers
    }
  };

  return (
    <div className="p-6 text-center space-y-4">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold">{t('application_accepted')}</h2>
      {car.bookingId && <p className="text-muted-foreground">{t('application_number', { bookingId: car.bookingId })}</p>}
      <p className="text-sm text-muted-foreground px-4">{t('manager_contact_message')}</p>
      <Button 
        onClick={handleCloseWebApp} 
        className="w-full bg-green-500 hover:bg-green-600 text-white"
      >
        {t('close_button')}
      </Button>
    </div>
  );
};

interface SendBookFormProps {
  isOpen: boolean;
  onClose: () => void;
  car: any;
  filters: any;
  requireWhatsApp?: boolean;
}

export const SendBookForm: React.FC<SendBookFormProps> = ({ 
  isOpen, 
  onClose, 
  car, 
  filters, 
  requireWhatsApp = false 
}) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  // Local state for booking submission
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isBookingSubmitted, setIsBookingSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Self-contained booking submission logic
  const handleBookingSubmit = async (contact: { value: string; type: string }) => {
    if (!car || !filters?.startDate || !filters?.endDate) {
      console.error('Missing data:', { car, filters });
      return;
    }

    setIsSubmittingBooking(true);

    try {
      const dailyPrice = getPriceForPeriod(car.pricing, filters.days, filters.startDate);
      const totalRentalPrice = dailyPrice * filters.days;
      const pickupDelivery = getDeliveryPrice(filters.pickupLocation);
      const returnDelivery = getDeliveryPrice(filters.returnLocation);
      const totalDelivery = pickupDelivery + returnDelivery;
      const grandTotal = totalRentalPrice + totalDelivery;

      const season = determineSeason(filters.startDate);
      const formData = {
        car: { 
          id: car.id, 
          name: car.name, 
          brand: car.brand, 
          model: car.model, 
          year: car.year, 
          color: car.color 
        },
        dates: { 
          start: filters.startDate.toISOString(), 
          end: filters.endDate.toISOString(), 
          days: filters.days 
        },
        locations: {
          pickupLocation: filters.pickupLocation,
          returnLocation: filters.returnLocation
        },
        pricing: {
          season: season,
          dailyRate: dailyPrice,
          totalRental: totalRentalPrice,
          deposit: car.pricing.deposit,
          deliveryPickup: pickupDelivery,
          deliveryReturn: returnDelivery,
          totalDelivery: totalDelivery,
          grandTotal: grandTotal
        },
        contact: contact,
        timestamp: new Date().toISOString(),
      };

      // ✅ Трекаем отправку брони
      console.log('📝 Submitting booking...', { car: car.name, bookingSource: 'web' });
      await trackLeadEvent('booking_submitted', formData);

      // Create actual booking with pre_booking status
      const newBookingId = 'bk_' + Date.now();
      try {
        console.log('🔄 Calling submitBooking API...', { bookingId: newBookingId });
        const result = await submitBooking(formData, newBookingId, 'web');
        console.log('✅ Booking created successfully!', result);
        setBookingId(newBookingId);
        setIsBookingSubmitted(true);
        console.log('📺 State updated - ThankYouContent should now display');
      } catch (error) {
        console.error('❌ Failed to create booking:', error);
        // Don't throw - let the UI show error state instead of silently failing
        alert('Не удалось создать бронь. Пожалуйста, попробуйте снова.');
        return;
      }

    } catch (error) {
      console.error('Booking submission failed:', error);
      // Note: In a real implementation, you might want to show a toast here
      // But since this is a self-contained component, we log the error
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  if (!isOpen || !car || !filters) return null;

  const title = isBookingSubmitted ? t('application_accepted') : t('booking_confirmation');
  const TitleIcon = isBookingSubmitted ? 
    <CheckCircle className="w-5 h-5 text-green-500" /> : 
    <Car className="w-5 h-5 text-primary" />;

  const content = isBookingSubmitted ? (
    <ThankYouContent car={{...car, bookingId}} onClose={onClose} />
  ) : (
    <BookingConfirmationContent
      car={car}
      filters={filters}
      onClose={onClose}
      onBookingSubmit={handleBookingSubmit}
      isSubmitting={isSubmittingBooking}
      requireWhatsApp={requireWhatsApp}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              {TitleIcon}
              {title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {TitleIcon}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="-mt-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendBookForm;