import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { OfferCard } from "@/components/content/OfferCard";
import { getAllOffers, clearContentCache } from "@/utils/contentLoader";
import { OfferData } from "@/types/seo";
import { Loader2, Tag } from "lucide-react";

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        clearContentCache();
        const data = await getAllOffers();
        setOffers(data);
      } catch (err) {
        console.error('Error loading offers:', err);
        setError('Ошибка загрузки офферов');
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Helmet>
        <title>Спецпредложения | Sunny Rentals</title>
        <meta 
          name="description" 
          content="Выгодные предложения на аренду авто на Пхукете. Специальные цены на длительную аренду, сезонные акции и эксклюзивные условия от Sunny Rentals." 
        />
        <meta name="keywords" content="офферы аренда авто пхукет, спецпредложения прокат машин, акции аренда пхукет" />
        <meta property="og:title" content="Спецпредложения | Sunny Rentals" />
        <meta property="og:description" content="Выгодные предложения на аренду авто на Пхукете" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 rounded-full mb-4">
            <Tag className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-cyan-700">Спецпредложения</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Выгодные предложения
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Специальные цены и условия на аренду автомобилей на Пхукете. 
            Выберите подходящее предложение и забронируйте машину в 2 клика!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && offers.length === 0 && (
          <div className="text-center py-20">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">
              Пока нет предложений
            </h2>
            <p className="text-slate-500">
              Скоро здесь появятся выгодные предложения!
            </p>
          </div>
        )}

        {/* Offers Grid */}
        {!loading && !error && offers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <OfferCard
                key={offer.slug}
                title={offer.title}
                slug={offer.slug}
                content={offer.content}
                cta={offer.cta}
                cta_color={offer.cta_color}
                cta_link={offer.url_params ? `/offer` : undefined}
              />
            ))}
          </div>
        )}

        {/* CTA Section */}
        {!loading && !error && offers.length > 0 && (
          <div className="mt-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Не нашли подходящее предложение?</h2>
            <p className="text-cyan-100 mb-6">
              Забронируйте автомобиль напрямую и получите персональную скидку!
            </p>
            <a
              href="https://t.me/webapp_rent_bot"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-cyan-600 font-bold rounded-full hover:bg-cyan-50 transition-colors"
            >
              Забронировать сейчас
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
