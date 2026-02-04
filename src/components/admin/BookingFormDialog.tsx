import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, parse } from 'date-fns';
import { 
  Calendar, MapPin, Trash2, X, Car as CarIcon, 
  Search, Plus, CircleDollarSign, User as UserIcon, Clock, ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // Загрузка данных
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

  // Инициализация (Календарь/CRM/Редактирование)
  useEffect(() => {
    if (isOpen) {
      if (booking) {
        const fd = booking.form_data;
        setSelectedTab('manual');
        setStartDate(new Date(fd.dates.start));
        setEndDate(new Date(fd.dates.end));
        setCustomerName(fd.contact.name || '');
        setCustomerContact(fd.contact.value || '');
        setContactType(fd.contact.type || 'telegram');
        setPickupLocation(fd.locations?.pickupLocation || 'airport');
        setReturnLocation(fd.locations?.returnLocation || 'airport');
        setPickupAddress(fd.locations?.pickupAddress || '');
        setReturnAddress(fd.locations?.returnAddress || '');
        setManualData({
          name: fd.car.name, brand: fd.car.brand, model: fd.car.model, 
          year: fd.car.year, dailyRate: fd.pricing.dailyRate.toString(), 
          deposit: fd.pricing.deposit.toString()
        });
      } else {
        if (carId) { setSelectedVehicleId(carId); setSelectedTab('fleet'); }
        if (initialDateRange) { setStartDate(initialDateRange.start); setEndDate(initialDateRange.end); }
        if (userName) setCustomerName(userName);
        if (userContact) setCustomerContact(userContact);
      }
    }
  }, [isOpen, booking, carId, initialDateRange]);

  // Расчет Pricing (Аэропорт 0 / Остальное 500)
  const pricing = useMemo(() => {
    if (!startDate || !endDate) return null;
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    let dailyRate = 0;
    let deposit = 5000;

    if (selectedTab === 'fleet') {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      dailyRate = v?.pricing?.low_season?.price_1_6 || 0;
    } else {
      dailyRate = parseInt(manualData.dailyRate) || 0;
      deposit = parseInt(manualData.deposit) || 5000;
    }

    const deliveryPickup = pickupLocation === 'airport' ? 0 : 500;
    const deliveryReturn = returnLocation === 'airport' ? 0 : 500;
    const totalDelivery = deliveryPickup + deliveryReturn;

    return {
      days, dailyRate, deposit, 
      totalRental: dailyRate * days,
      deliveryPickup, deliveryReturn, totalDelivery,
      grandTotal: (dailyRate * days) + totalDelivery
    };
  }, [startDate, endDate, selectedVehicleId, selectedTab, manualData, pickupLocation, returnLocation, vehicles]);

  const handleSubmit = async () => {
  if (!pricing || pricing.dailyRate === 0) {
    toast.error("Данные не полны");
    return;
  }

  setIsSubmitting(true);
  try {
    const startDateTime = parse(pickupTime, 'HH:mm', startDate!);
    const endDateTime = parse(returnTime, 'HH:mm', endDate!);

    const v = selectedTab === 'fleet' 
      ? vehicles.find(vec => vec.id === selectedVehicleId)
      : null;

    // 1. Формируем только внутренний объект form_data
    const formDataForApi = {
      car: {
        id: String(selectedTab === 'fleet' ? v?.id : `manual_${Date.now()}`),
        name: String(selectedTab === 'fleet' ? v?.name : manualData.name),
        brand: String(selectedTab === 'fleet' ? v?.brand : (manualData.brand || "")),
        model: String(selectedTab === 'fleet' ? v?.model : (manualData.model || "")),
        year: String(selectedTab === 'fleet' ? v?.year : (manualData.year || "")),
        color: String(selectedTab === 'fleet' ? (v?.color || "") : "")
      },
      dates: {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        days: Math.round(pricing.days)
      },
      locations: {
        pickupLocation: String(pickupLocation),
        returnLocation: String(returnLocation),
        pickupAddress: String(pickupAddress || ""),
        returnAddress: String(returnAddress || "")
      },
      pricing: {
        dailyRate: Math.round(pricing.dailyRate),
        totalRental: Math.round(pricing.totalRental),
        deposit: Math.round(pricing.deposit),
        deliveryPickup: Math.round(pricing.deliveryPickup),
        deliveryReturn: Math.round(pricing.deliveryReturn),
        totalDelivery: Math.round(pricing.totalDelivery),
        grandTotal: Math.round(pricing.grandTotal)
      },
      contact: {
        value: String(customerContact),
        type: String(contactType),
        name: String(customerName || ""),
        phone: contactType === 'phone' ? String(customerContact) : ""
      },
      timestamp: new Date().toISOString()
    };

    // 2. Отправляем через твой хелпер api.ts
    // submitBooking сам упакует это в { form_data: formDataForApi, booking_id: id }
    const bId = booking?.booking_id || booking?.id || null;
    
    await submitBooking(formDataForApi as any, bId);

    toast.success(isEditing ? "Обновлено" : "Создано");
    onSuccess(); // Это обновит календарь/список
    onClose();
  } catch (e: any) {
    console.error("Submit error:", e);
    // Если пришла ошибка 409 (Overlap), она пробросится сюда
    toast.error(e.message || "Ошибка 422: проверьте данные");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-3xl p-0 shadow-2xl border-none">
        
        {/* Header - Simple & Clean */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              {isEditing ? 'Правка бронирования' : 'Новое бронирование'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {isEditing ? `ID: ${booking.booking_id}` : 'Ручное создание записи'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* LEFT: FLEET SELECTION */}
          <div className="p-8 bg-slate-50/40 border-r border-slate-100">
            <Tabs value={selectedTab} onValueChange={(v: any) => setSelectedTab(v)} className="space-y-6">
              <TabsList className="bg-slate-200/50 p-1 rounded-2xl w-full">
                <TabsTrigger value="fleet" className="flex-1 font-black uppercase text-[10px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Автопарк</TabsTrigger>
                <TabsTrigger value="manual" className="flex-1 font-black uppercase text-[10px] rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Ручной ввод</TabsTrigger>
              </TabsList>

              <TabsContent value="fleet" className="space-y-4 m-0">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      placeholder="МОДЕЛЬ..." 
                      className="pl-9 font-bold uppercase text-[10px] h-9 rounded-xl border-slate-200 bg-white"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[110px] font-black uppercase text-[9px] h-9 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['all', 'suv', 'compact', '7s', 'sedan','bikes'].map(cat => (
                        <SelectItem key={cat} value={cat} className="text-[10px] font-bold uppercase">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {vehicles.filter(v => (categoryFilter === 'all' || v.class?.toLowerCase() === categoryFilter) && v.name.toLowerCase().includes(searchQuery.toLowerCase())).map(v => (
                    <div 
                      key={v.id} onClick={() => setSelectedVehicleId(v.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center group",
                        selectedVehicleId === v.id ? "border-blue-500 bg-white shadow-md shadow-blue-50" : "border-transparent bg-white hover:border-slate-200"
                      )}
                    >
                      <div>
                        <p className="font-black text-xs uppercase text-slate-800">{v.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Владелец: {owners.find(o => o.id === carOwnerMap[v.id])?.name || 'NAMO'}</p>
                      </div>
                      <Badge variant="secondary" className="font-black text-blue-600 bg-blue-50">{v.pricing?.low_season?.price_1_6}฿</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="grid grid-cols-2 gap-3 m-0">
                <Input placeholder="МАРКА МОДЕЛЬ" className="col-span-2 font-bold uppercase text-[10px] h-11 rounded-xl" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} />
                <Input placeholder="ЦЕНА/ДЕНЬ" className="font-bold uppercase text-[10px] h-11 rounded-xl" value={manualData.dailyRate} onChange={e => setManualData({...manualData, dailyRate: e.target.value})} />
                <Input placeholder="ДЕПОЗИТ" className="font-bold uppercase text-[10px] h-11 rounded-xl" value={manualData.deposit} onChange={e => setManualData({...manualData, deposit: e.target.value})} />
              </TabsContent>
            </Tabs>

            {/* BILLING SUMMARY */}
            <div className="mt-10 p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Расчет стоимости</span>
                <Badge className="bg-slate-900 text-[9px] font-black rounded-lg">{pricing?.days}D</Badge>
              </div>
              <div className="space-y-3 pb-6 border-b border-dashed border-slate-100">
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Аренда ({pricing?.dailyRate}฿)</span>
                  <span className="text-slate-800">{pricing?.totalRental} ฿</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase">
                  <span className="text-slate-400">Доставка (Итого)</span>
                  <span className="text-blue-500">+{pricing?.totalDelivery} ฿</span>
                </div>
              </div>
              <div className="pt-6 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase mb-1">Итого к оплате</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{pricing?.grandTotal.toLocaleString()} ฿</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-orange-400 uppercase">Залог: {pricing?.deposit} ฿</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: DATES & CLIENT */}
          <div className="p-8 space-y-8 bg-white">
            
            {/* DATES & TIME */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Получение</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-bold text-xs h-11 rounded-2xl border-slate-100"><Calendar className="mr-2 h-4 w-4 text-blue-500" />{startDate ? format(startDate, 'dd.MM.yyyy') : '---'}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl"><CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                </Popover>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger className="h-10 font-bold text-xs rounded-2xl bg-slate-50 border-none"><Clock className="mr-2 h-3.5 w-3.5 text-slate-300" /><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Возврат</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-bold text-xs h-11 rounded-2xl border-slate-100"><Calendar className="mr-2 h-4 w-4 text-red-400" />{endDate ? format(endDate, 'dd.MM.yyyy') : '---'}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl"><CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                </Popover>
                <Select value={returnTime} onValueChange={setReturnTime}>
                  <SelectTrigger className="h-10 font-bold text-xs rounded-2xl bg-slate-50 border-none"><Clock className="mr-2 h-3.5 w-3.5 text-slate-300" /><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">{timeOptions.map(t => <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* CLIENT INFO */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Клиент</label>
                <Input placeholder="ФИО КЛИЕНТА" className="font-black uppercase text-xs h-12 rounded-2xl border-slate-100 bg-slate-50/30 focus:bg-white transition-all" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Select value={contactType} onValueChange={(v: any) => setContactType(v)}>
                  <SelectTrigger className="w-[90px] font-black text-[10px] h-12 rounded-2xl border-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl"><SelectItem value="telegram">TG</SelectItem><SelectItem value="whatsapp">WA</SelectItem><SelectItem value="phone">PH</SelectItem></SelectContent>
                </Select>
                <Input placeholder="КОНТАКТ / ТЕЛЕФОН" className="flex-1 font-bold text-xs h-12 rounded-2xl border-slate-100 bg-slate-50/30" value={customerContact} onChange={e => setCustomerContact(e.target.value)} />
              </div>
            </div>

            {/* LOCATIONS */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Место выдачи</label>
                  <Select value={pickupLocation} onValueChange={setPickupLocation}>
                    <SelectTrigger className="font-bold uppercase text-[10px] h-10 rounded-2xl border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="АДРЕС ВЫДАЧИ" className="font-bold uppercase text-[9px] h-9 rounded-xl bg-slate-50 border-none px-3" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Место возврата</label>
                  <Select value={returnLocation} onValueChange={setReturnLocation}>
                    <SelectTrigger className="font-bold uppercase text-[10px] h-10 rounded-2xl border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">{PICKUP_LOCATIONS.map(l => <SelectItem key={l.id} value={l.id} className="text-[10px] font-bold uppercase">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="АДРЕС ВОЗВРАТА" className="font-bold uppercase text-[9px] h-9 rounded-xl bg-slate-50 border-none px-3" value={returnAddress} onChange={e => setReturnAddress(e.target.value)} />
               </div>
            </div>

            <Button 
              className="w-full h-16 bg-[#f8b515] hover:bg-[#e0a312] text-white font-black uppercase text-sm rounded-[24px] shadow-xl shadow-orange-100 transition-all active:scale-[0.98] mt-4"
              disabled={isSubmitting} onClick={handleSubmit}
            >
              {isSubmitting ? 'СОХРАНЕНИЕ...' : isEditing ? 'ОБНОВИТЬ ДАННЫЕ' : 'ПОДТВЕРДИТЬ БРОНЬ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}