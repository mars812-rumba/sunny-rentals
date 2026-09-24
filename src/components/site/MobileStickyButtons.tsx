import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export const MobileStickyButtons = () => {
  return (
    <>
      {/* Mobile Bottom Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border p-4 safe-area-inset-bottom shadow-lg">
        <a
          href="https://t.me/webapp_rent_bot"
          className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full")}
        >
          🚀 Забронировать
        </a>
      </div>

      {/* Personal Telegram FAB */}
      <a 
        href="https://t.me/marseloid"
        className="fixed bottom-20 md:bottom-8 right-4 z-50 w-14 h-14 bg-[#229ED9] hover:bg-[#168dcc] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"
        aria-label="Написать @marseloid в Telegram"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </>
  );
};
