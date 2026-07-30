import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RankBotLanding } from "@/components/site/RankBotLanding";
import { clearContentCache, getAllOffers } from "@/utils/contentLoader";
import type { OfferData } from "@/types/seo";

const Site = () => {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        clearContentCache();
        const data = await getAllOffers();
        setOffers(data);
      } catch (error) {
        console.error("Error loading offers:", error);
      } finally {
        setOffersLoading(false);
      }
    };

    loadOffers();
  }, []);

  return (
    <>
      <Helmet>
        <title>Аренда авто и байков на Пхукете в RankBot | Sunny Rentals</title>
        <meta
          name="description"
          content="Выберите и забронируйте авто или байк на Пхукете через Telegram WebApp RankBot. Без предоплаты, прозрачная цена и поддержка 24/7."
        />
        <meta
          name="keywords"
          content="аренда авто пхукет, аренда байка пхукет, RankBot, Telegram WebApp, Sunny Rentals"
        />

        <meta property="og:title" content="Sunny Rentals — бронирование в RankBot" />
        <meta
          property="og:description"
          content="Авто и байки на Пхукете. Выбор, расчёт и бронь в Telegram WebApp."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://sunny-rentals.online/og-image.jpg" />

        <script type="application/ld+json">
          {`{
            "@context": "https://schema.org",
            "@type": "AutoRental",
            "name": "Sunny Rentals",
            "description": "Car and bike rental in Phuket through Telegram WebApp RankBot",
            "priceRange": "฿250-฿2000",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Phuket",
              "addressCountry": "TH"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "100"
            },
            "telephone": "+66842039140",
            "url": "https://sunny-rentals.online",
            "sameAs": [
              "https://t.me/webapp_rent_bot",
              "https://t.me/carbook_in_phuket"
            ]
          }`}
        </script>
      </Helmet>
      <RankBotLanding offers={offers} offersLoading={offersLoading} />
    </>
  );
};

export default Site;
