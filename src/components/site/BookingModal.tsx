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

// --- Helper functions ---
const getPriceForPeriod = (pricing, days) => {
  const season = 'low_season';
  if (days >= 30) return pricing[season].price_30;
  if (days >= 15) return pricing[season].price_15_29;
  if (days >= 7) return pricing[season].price_7_14;
  return pricing[season].price_1_6;
};

const getDeliveryPrice = (location) => {
  return location === 'airport' ? 0 : 500;
};

const BookingConfirmationContent = ({ car, filters, onClose, onBookingSubmit, isSubmitting, requireWhatsApp }) => {
  const { t } = useLanguage();
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');

  const dailyPrice = getPriceForPeriod(car.pricing, filters.days);
  const totalRentalPrice = dailyPrice * filters.days;
  const pickupDelivery = getDeliveryPrice(filters.pickupLocation);
  const returnDelivery = getDeliveryPrice(filters.returnLocation);
  const totalDelivery = pickupDelivery + returnDelivery;
  const grandTotal = totalRentalPrice + totalDelivery;

  const handleBooking = () => {
    if (!onBookingSubmit) {
      // Если нет обработчика, ничего не делаем (для site компонентов)
      return;
    }
    
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
        <Button onClick={handleBooking} className="w-full bg-ocean-gradient hover:opacity-90" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('sending')}</> : (requireWhatsApp ? t('submit') : t('book'))}
        </Button>
      </div>
    </div>
  );
};

const ThankYouContent = ({ car, onClose }) => {
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
        <Button onClick={handleCloseWebApp} className="w-full bg-ocean-gradient hover:opacity-90">
          {t('close_button')}
        </Button>
      </div>
    );
  };

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: any; // Consider a more specific type for car
  filters: any; // Consider a more specific type for filters
  onBookingSubmit?: (contact: { value: string; type: string }) => Promise<void>;
  isSubmitting?: boolean;
  requireWhatsApp?: boolean;
  isSubmitted?: boolean;
  bookingId?: string | null;
}

const BookingModal = ({ isOpen, onClose, car, filters, onBookingSubmit, isSubmitting, requireWhatsApp, isSubmitted, bookingId }: BookingModalProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  if (!isOpen || !car || !filters) return null;

  const title = isSubmitted ? t('application_accepted') : t('booking_confirmation');
  const TitleIcon = isSubmitted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Car className="w-5 h-5 text-primary" />;

  const content = isSubmitted ? (
    <ThankYouContent car={{...car, bookingId}} onClose={onClose} />
  ) : (
    <BookingConfirmationContent
      car={car}
      filters={filters}
      onClose={onClose}
      onBookingSubmit={onBookingSubmit}
      isSubmitting={isSubmitting}
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

export default BookingModal;