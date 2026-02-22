import React, { useState, useEffect, Suspense } from "react";
import { Car, Calendar, Users } from "lucide-react";
import AdminPanel from "./AdminPanel";

const CRMPage = React.lazy(() => import("./CRMPage"));
const AdminScheduler = React.lazy(() => import("./AdminScheduler"));

export default function AdminApp() {
  const [currentScreen, setCurrentScreen] = useState(1); // Начинаем с Calendar
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;
  const [carOwnersMap, setCarOwnersMap] = useState<Record<string, object>>({});

  useEffect(() => {
    if (tg) tg.ready();
    if (user) {
      setCarOwnersMap(prev => ({
        ...prev,
        telegramUser: {
          id: user.id,
          name: user.username || user.first_name || ""
        }
      }));
    }
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentScreen > 0) setCurrentScreen(s => s - 1);
      if (e.key === "ArrowRight" && currentScreen < 2) setCurrentScreen(s => s + 1);
      if (e.key === "1") setCurrentScreen(0);
      if (e.key === "2") setCurrentScreen(1);
      if (e.key === "3") setCurrentScreen(2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentScreen]);

  const screens = [
    { id: 0, name: "Авто", icon: Car, component: AdminPanel },
    { id: 1, name: "Календарь", icon: Calendar, component: AdminScheduler },
    { id: 2, name: "CRM", icon: Users, component: CRMPage },
  ];

  const CurrentComponent = screens[currentScreen].component;

  const BottomNavBar = () => (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-gray-200 sm:hidden">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
        {screens.map((screen) => {
          const Icon = screen.icon;
          const isActive = currentScreen === screen.id;
          return (
            <button
              key={screen.name}
              onClick={() => setCurrentScreen(screen.id)}
              type="button"
              className={`inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group ${isActive ? "text-blue-600" : "text-gray-500"}`}>
              <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
              <span className="text-xs">{screen.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Sticky Menu */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm hidden sm:block">
        <div className="flex items-center justify-around px-2 py-1">
          {screens.map((screen) => {
            const Icon = screen.icon;
            const isActive = currentScreen === screen.id;
            
            return (
              <button
                key={screen.id}
                onClick={() => setCurrentScreen(screen.id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg transition-all
                  ${isActive 
                    ? "bg-blue-500 text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100"
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                <span className="text-[10px] font-medium">{screen.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        }>
          <CurrentComponent />
        </Suspense>
      </div>
      <BottomNavBar />
    </div>
  );
}