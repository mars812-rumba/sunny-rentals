import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, parse, eachDayOfInterval } from 'date-fns';
import { 
  Calendar, MapPin, Trash2, X, Car as CarIcon, 
  Search, Plus, CircleDollarSign, User as UserIcon, Clock, ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// API и утилиты
import { PICKUP_LOCATIONS, generateTimeOptions, submitBooking } from '@/api/api';

// --- УТИЛИТЫ СЕЗОННОСТИ ---
const getSeason = (date: Date): 'high_season' | 'low_season' => {
  const month = date.getMonth(); // 0 - Январь, 10 - Ноябрь
  // High Season: Ноябрь (10) - Апрель (3)
  return (month >= 10 || month <= 3) ? 'high_season' : 'low_season';
};

const getPriceTierKey = (days: number): string => {
  if (days >= 30) return 'price_30';
  if (days >= 15) return 'price_15_29';
  if (days >= 7) return 'price_7_14';
  return 'price_1_6';
};

interface BookingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | string;
  userName?: string;
  userContact?: string;
  initialDateRange?: { start: Date; end: Date };
  carId?: string;
  booking?: any;
  onSuccess: () => void;
}

// ... (все импорты и утилиты сезонности те же)

export function BookingFormDialog({
  isOpen, onClose, userId, userName, userContact, 
  initialDateRange, carId, booking, onSuccess 
}: BookingFormDialogProps) {
  
  const isEditing = !!booking;
  
  // Data State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [carOwnerMap, setCarOwnerMap] = useState<Record<string, string>>({});
  const [owners, setOwners] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // UI State
  const [selectedTab, setSelectedTab] = useState<'fleet' | 'manual'>('fleet');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form State
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [pickupTime, setPickupTime] = useState('13:00');
  const [returnTime, setReturnTime] = useState('13:00');
  const [pickupLocation, setPickupLocation] = useState('airport');
  const [returnLocation, setReturnLocation] = useState('airport');
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnAddress, setReturnAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [contactType, setContactType] = useState<'telegram' | 'whatsapp' | 'phone'>('telegram');
  const [manualData, setManualData] = useState({ name: '', brand: '', model: '', year: '', dailyRate: '', deposit: '5000' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // 1. Загрузка справочников
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [vRes, oRes, mRes] = await Promise.all([
            fetch('/api/fleet'), fetch('/api/car-owners'), fetch('/api/car-owners-map')
          ]);
          const vData = await vRes.json();
          setVehicles(Object.values(vData.vehicles || {}));
          setOwners((await oRes.json()).owners || []);
          setCarOwnerMap(await mRes.json() || {});
        } finally { setLoadingData(false); }
      };
      fetchData();
    }
  }, [isOpen]);

  // 2. ИСПРАВЛЕННАЯ ЛОГИКА СБРОСА И ИНИЦИАЛИЗАЦИИ
  useEffect(() => {
    if (isOpen) {
      // ШАГ 1: Полный сброс всех состояний до дефолтных
      setSelectedVehicleId('');
      setCustomerName('');
      setCustomerContact('');
      setContactType('telegram');
      setPickupLocation('airport');
      setReturnLocation('airport');
      setPickupAddress('');
      setReturnAddress('');
      setManualData({ name: '', brand: '', model: '', year: '', dailyRate: '', deposit: '5000' });

      // ШАГ 2: Наполнение данными
      if (booking && booking.form_data) {
        const fd = booking.form_data;
        const bCarId = String(fd.car?.id || '');
        const isManual = bCarId.includes('manual');

        // Устанавливаем вкладку
        setSelectedTab(isManual ? 'manual' : 'fleet');
        
        // Если это авто из парка, выбираем его ID
        if (!isManual) {
          setSelectedVehicleId(bCarId);
        }

        // Даты
        if (fd.dates?.start) setStartDate(new Date(fd.dates.start));
        if (fd.dates?.end) setEndDate(new Date(fd.dates.end));
        
        // Контакты
        setCustomerName(fd.contact?.name || '');
        setCustomerContact(fd.contact?.value || '');
        setContactType((fd.contact?.type as any) || 'telegram');

        // Локации
        setPickupLocation(fd.locations?.pickupLocation || 'airport');
        setReturnLocation(fd.locations?.returnLocation || 'airport');
        setPickupAddress(fd.locations?.pickupAddress || '');
        setReturnAddress(fd.locations?.returnAddress || '');

        // Ручные данные (заполняем ВСЕГДА, чтобы поля не были пустыми)
        setManualData({
          name: fd.car?.name || '',
          brand: fd.car?.brand || '',
          model: fd.car?.model || '',
          year: fd.car?.year || '',
          dailyRate: String(fd.pricing?.dailyRate || ''),
          deposit: String(fd.pricing?.deposit || '5000')
        });

      } else {
        // Логика для новой брони
        if (carId) { 
          setSelectedVehicleId(carId); 
          setSelectedTab('fleet'); 
        }
        if (initialDateRange) { 
          setStartDate(initialDateRange.start); 
          setEndDate(initialDateRange.end); 
        }
        if (userName) setCustomerName(userName);
        if (userContact) setCustomerContact(userContact);
      }
    }
  }, [isOpen, booking, carId]); // Срабатывает только при открытии или смене брони

  // 3. РАСЧЕТ СТОИМОСТИ (Остается без изменений, он рабочий)
  const pricing = useMemo(() => {
    if (!startDate || !endDate) return null;
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    let totalRental = 0;
    let deposit = 5000;
    let avgDailyRate = 0;

    if (selectedTab === 'fleet') {
      const v = vehicles.find(vec => vec.id === selectedVehicleId);
      if (v && v.pricing) {
        deposit = v.pricing.deposit || 5000;
        const tierKey = getPriceTierKey(days);
        try {
          const dayInterval = eachDayOfInterval({ start: startDate, end: endDate });
          const activeDays = dayInterval.length > 1 ? dayInterval.slice(0, -1) : dayInterval;
          activeDays.forEach(day => {
            const season = getSeason(day);
            const dailyPrice = v.pricing[season]?.[tierKey] || v.pricing['low_season']?.[tierKey] || 0;
            totalRental += dailyPrice;
          });
          avgDailyRate = Math.round(totalRental / days);
        } catch (e) { totalRental = 0; }
      }
    } else {
      avgDailyRate = parseInt(manualData.dailyRate) || 0;
      totalRental = avgDailyRate * days;
      deposit = parseInt(manualData.deposit) || 5000;
    }

    const deliveryPickup = pickupLocation === 'airport' ? 0 : 500;
    const deliveryReturn = returnLocation === 'airport' ? 0 : 500;
    const totalDelivery = deliveryPickup + deliveryReturn;

    return {
      days, dailyRate: avgDailyRate, deposit, totalRental, 
      deliveryPickup, deliveryReturn, totalDelivery,
      grandTotal: (totalRental || 0) + totalDelivery
    };
  }, [startDate, endDate, selectedVehicleId, selectedTab, manualData, pickupLocation, returnLocation, vehicles]);

  // --- ВЛАДЕЛЬЦЫ (для UI) ---
  const selectedCarOwner = useMemo(() => {
    if (selectedTab !== 'fleet' || !selectedVehicleId) return null;
    return owners.find(o => o.id === carOwnerMap[selectedVehicleId]);
  }, [selectedVehicleId, carOwnerMap, owners, selectedTab]);

  // ... (Далее идет JSX, который не менялся)
  const handleSubmit = async () => {
    if (!pricing || pricing.dailyRate === 0) {
      toast.error("Данные не полны");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = parse(pickupTime, 'HH:mm', startDate!);
      const endDateTime = parse(returnTime, 'HH:mm', endDate!);
      const v = selectedTab === 'fleet' ? vehicles.find(vec => vec.id === selectedVehicleId) : null;
      const cId = isEditing && booking?.form_data?.car?.id ? booking.form_data.car.id : (selectedTab === 'fleet' ? v?.id : `manual_${Date.now()}`);

      const formDataForApi = {
        car: {
          id: String(cId),
          name: String(selectedTab === 'fleet' ? v?.name : manualData.name),
          brand: String(selectedTab === 'fleet' ? v?.brand : (manualData.brand || "")),
          model: String(selectedTab === 'fleet' ? v?.model : (manualData.model || "")),
          year: String(selectedTab === 'fleet' ? v?.year : (manualData.year || "")),
          color: String(selectedTab === 'fleet' ? (v?.color || "") : "")
        },
        dates: {
          start: startDateTime.toISOString(), end: endDateTime.toISOString(), days: Math.round(pricing.days)
        },
        locations: {
          pickupLocation: String(pickupLocation), returnLocation: String(returnLocation),
          pickupAddress: String(pickupAddress || ""), returnAddress: String(returnAddress || "")
        },
        pricing: {
          dailyRate: Math.round(pricing.dailyRate), totalRental: Math.round(pricing.totalRental),
          deposit: Math.round(pricing.deposit), deliveryPickup: Math.round(pricing.deliveryPickup),
          deliveryReturn: Math.round(pricing.deliveryReturn), totalDelivery: Math.round(pricing.totalDelivery),
          grandTotal: Math.round(pricing.grandTotal)
        },
        contact: {
          value: String(customerContact), type: String(contactType), name: String(customerName || ""),
          phone: contactType === 'phone' ? String(customerContact) : ""
        },
        timestamp: new Date().toISOString()
      };

      const bId = booking?.booking_id || booking?.id || null;
      await submitBooking(formDataForApi as any, bId);

      toast.success(isEditing ? "Обновлено" : "Создано");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!booking?.booking_id || !confirm(`Удалить бронь?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.booking_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Ошибка API");
      toast.success("Удалено");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-3xl p-0 shadow-2xl border-none">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              {isEditing ? 'Правка брони' : 'Новая бронь'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* LEFT PANEL */}
          <div className="p-8 bg-slate-50/40 border-r border-slate-100">
            <Tabs value={selectedTab} onValueChange={(v: any) => setSelectedTab(v)} className="space-y-6">
              <TabsList className="bg-slate-200/50 p-1 rounded-2xl w-full">
                <TabsTrigger value="fleet" className="flex-1 font-black uppercase text-[10px] rounded-xl">Автопарк</TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 font-black uppercase text-[10px] rounded-xl">Вручную</TabsTrigger>
              </TabsList>

              <TabsContent value="fleet" className="space-y-4 m-0">
                <Input 
                  placeholder="ПОИСК..." 
                  className="font-bold uppercase text-[10px] h-9 rounded-xl"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {vehicles.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map(v => {
                    const currentSeason = getSeason(new Date());
                    const tier = getPriceTierKey(pricing?.days || 1);
                    const listPrice = v.pricing?.[currentSeason]?.[tier] || v.pricing?.['low_season']?.[tier] || 0;

                    return (
                      <div 
                        key={v.id} onClick={() => setSelectedVehicleId(v.id)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center bg-white",
                          selectedVehicleId === v.id ? "border-blue-500 shadow-md" : "border-transparent hover:border-slate-200"
                        )}
                      >
                        <div>
                          <p className="font-black text-xs uppercase text-slate-800">{v.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            Владелец: {owners.find(o => o.id === carOwnerMap[v.id])?.name || 'Sunny'}
                          </p>
                        </div>
                        <Badge className="bg-blue-50 text-blue-600 font-black">{listPrice}฿</Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="grid grid-cols-2 gap-3 m-0">
                <Input placeholder="МАРКА МОДЕЛЬ" className="col-span-2 text-[10px] font-bold h-11 rounded-xl" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} />
                <Input placeholder="ЦЕНА" className="text-[10px] font-bold h-11 rounded-xl" value={manualData.dailyRate} onChange={e => setManualData({...manualData, dailyRate: e.target.value})} />
                <Input placeholder="ЗАЛОГ" className="text-[10px] font-bold h-11 rounded-xl" value={manualData.deposit} onChange={e => setManualData({...manualData, deposit: e.target.value})} />
              </TabsContent>
            </Tabs>

            {/* BILLING */}
            <div className="mt-10 p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase text-slate-300">Расчет стоимости</span>
                <Badge className="bg-slate-900 text-[9px] font-black">{pricing?.days}D</Badge>
              </div>
              <div className="space-y-3 pb-6 border-b border-dashed border-slate-100">
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Аренда ({pricing?.dailyRate}฿/сут)</span>
                  <span className="text-slate-800">{pricing?.totalRental} ฿</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Доставка</span>
                  <span className="text-blue-500">+{pricing?.totalDelivery} ฿</span>
                </div>
              </div>
              <div className="pt-6">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Итого</p>
                <p className="text-4xl font-black text-slate-900">{pricing?.grandTotal.toLocaleString()} ฿</p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Выдача</label>
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" className="w-full text-xs font-bold h-11 rounded-2xl border-slate-100">{startDate ? format(startDate, 'dd.MM.yyyy') : '---'}</Button></PopoverTrigger>
                  <PopoverContent className="p-0 border-none shadow-2xl rounded-3xl"><CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                </Popover>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-2xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Возврат</label>
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" className="w-full text-xs font-bold h-11 rounded-2xl border-slate-100">{endDate ? format(endDate, 'dd.MM.yyyy') : '---'}</Button></PopoverTrigger>
                  <PopoverContent className="p-0 border-none shadow-2xl rounded-3xl"><CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                </Popover>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-2xl bg-slate-50 border-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Input placeholder="ФИО КЛИЕНТА" className="font-black uppercase text-xs h-12 rounded-2xl bg-slate-50/30" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <div className="flex gap-2">
                <Select value={contactType} onValueChange={(v: any) => setContactType(v)}>
                  <SelectTrigger className="w-[90px] font-black text-[10px] h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl"><SelectItem value="telegram">TG</SelectItem><SelectItem value="whatsapp">WA</SelectItem><SelectItem value="phone">PH</SelectItem></SelectContent>
                </Select>
                <Input placeholder="КОНТАКТ" className="flex-1 font-bold text-xs h-12 rounded-2xl bg-slate-50/30" value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Локация выдачи</label>
                  <Select value={pickupLocation} onValueChange={setPickupLocation}>
                    <SelectTrigger className="font-bold uppercase text-[10px] h-10 rounded-2xl border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="АДРЕС" className="text-[9px] font-bold h-9 rounded-xl bg-slate-50 border-none px-3" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Локация возврата</label>
                  <Select value={returnLocation} onValueChange={setReturnLocation}>
                    <SelectTrigger className="font-bold uppercase text-[10px] h-10 rounded-2xl border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="АДРЕС" className="text-[9px] font-bold h-9 rounded-xl bg-slate-50 border-none px-3" value={returnAddress} onChange={e => setReturnAddress(e.target.value)} />
               </div>
            </div>

            <div className="flex gap-3 mt-4">
              {isEditing && (
                <Button variant="outline" className="h-16 px-6 border-2 border-red-200 text-red-600 rounded-[24px]" disabled={isDeleting} onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button className="flex-1 h-16 bg-[#f8b515] text-white font-black rounded-[24px] shadow-xl" disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? '...' : isEditing ? 'ОБНОВИТЬ' : 'ПОДТВЕРДИТЬ'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}