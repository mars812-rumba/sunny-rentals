import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOffer, generateBookingUrl } from "@/utils/contentLoader";
import { OfferData } from "@/types/seo";
import { ArrowLeft, Calendar, Car, MapPin, Loader2, ExternalLink } from "lucide-react";

export default function OfferDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      if (!slug) {
        setError('Не указан slug оффера');
        setLoading(false);
        return;
      }
      
      try {
        const data = await getOffer(slug);
        if (!data) {
          setError('Оффер не найден');
        } else {
          setOffer(data);
        }
      } catch (err) {
        console.error('Error loading offer:', err);
        setError('Ошибка загрузки оффера');
      } finally {
        setLoading(false);
      }
    };
    loadOffer();
  }, [slug]);

  const handleBookingClick = () => {
    if (!offer?.url_params) {
      // Если нет URL параметров, просто открываем бота
      window.open('https://t.me/webapp_rent_bot', '_blank');
      return;
    }
    
    const bookingUrl = generateBookingUrl(offer.url_params);
    window.open(bookingUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{error || 'Оффер не найден'}</p>
        <Button onClick={() => navigate('/offers')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Вернуться к офферам
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>{offer.title} | Sunny Rentals</title>
        <meta name="description" content={offer.meta_description} />
        <meta name="keywords" content={offer.meta_keywords.join(', ')} />
        <meta property="og:title" content={offer.title} />
        <meta property="og:description" content={offer.meta_description} />
        <meta property="og:type" content="article" />
      </Helmet>

      <Header />

      <main className="p-4 space-y-4">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/offers')}
          variant="secondary"
          size="icon"
          className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Badge */}
        <Badge className="bg-primary text-primary-foreground">
          Спецпредложение
        </Badge>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{offer.title}</h1>
        </div>

        {/* URL Params Info */}
        {offer.url_params && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {offer.url_params.days && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{offer.url_params.days} дней</span>
              </div>
            )}
            {offer.url_params.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{offer.url_params.location}</span>
              </div>
            )}
            {offer.url_params.car_type && (
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-primary" />
                <span className="capitalize">{offer.url_params.car_type}</span>
              </div>
            )}
          </div>
        )}

        {/* Content Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <article className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {offer.content}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>

        {/* CTA Block */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-4 text-center">
            <h2 className="text-xl font-bold mb-2">
              {offer.cta}
            </h2>
            <p className="text-primary-foreground/80 text-sm mb-4">
              Забронируйте автомобиль прямо сейчас!
            </p>
            <Button
              onClick={handleBookingClick}
              variant="secondary"
              size="lg"
              className="w-full font-bold"
            >
              Забронировать
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Обновлено: {new Date(offer.generated_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
