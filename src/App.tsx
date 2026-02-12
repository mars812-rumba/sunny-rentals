import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LanguageSwitcher from "./components/LanguageSwitcher";
import AdminPanel from "./pages/AdminPanel";
import CarsPage from "./pages/CarsPage";
import Site from "./pages/Site";
import CRMPage from "@/pages/CRMPage";
import React, { Suspense, useEffect } from 'react';
import { trackLeadEvent } from '@/api/api';
import AdminApp from "./pages/AdminApp";

// ✅ Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

const AdminScheduler = React.lazy(() => import('./pages/AdminScheduler'));
const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      tg.ready();
      
      // Получаем user_id и username из Telegram
      const user = tg.initDataUnsafe?.user;
      const userId = user?.id;
      const username = user?.username || user?.first_name;
      
      console.log('📱 Webapp opened:', { userId, username });
      
      // ✅ Трекаем через FastAPI
      trackLeadEvent('webapp_opened')
        .then(() => console.log('✅ Webapp opened tracked'))
        .catch(err => console.error('❌ Failed to track:', err));
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/*<LanguageSwitcher />*/}
          <Routes>
            {/* ✅ НОВЫЙ роут - единая панель со свайпами */}
            <Route path="/admin/app" element={<AdminApp />} />
            
            {/* Основные роуты */}
            <Route path="/" element={<Site />} />
            <Route path="/app" element={<Index />} />
            <Route path="/admin" element={<AdminPanel />} />
            
            {/* Старые роуты - можно оставить или удалить */}
            <Route 
              path="/admin/scheduler" 
              element={
                <Suspense fallback={
                  <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                }>
                  <AdminScheduler />
                </Suspense>
              } 
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;