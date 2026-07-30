/**
 * SEO Content Types
 * Типы данных для офферов и блог-статей
 */

// URL параметры для бронирования
export interface UrlParams {
  days?: number;
  location?: string;
  car_type?: string;
  utm_source?: string;
  utm_medium?: string;
}

// Интерфейс оффера
export interface OfferData {
  type: 'offer';
  title: string;
  slug: string;
  meta_description: string;
  meta_keywords: string[];
  content: string;
  url_params?: UrlParams;
  cta: string;
  cta_color?: 'primary' | 'secondary';
  generated_at: string;
}

// Интерфейс блог-статьи
export interface BlogData {
  type: 'blog';
  title: string;
  slug: string;
  meta_description: string;
  meta_keywords: string[];
  content: string;
  author: string;
  reading_time_minutes: number;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  generated_at: string;
}

// Тип контента
export type ContentType = 'offer' | 'blog';

// Props для OfferCard
export interface OfferCardProps {
  title: string;
  slug: string;
  content: string;
  cta: string;
  cta_color?: 'primary' | 'secondary';
  cta_link?: string;
  onClick?: () => void;
}

// Props для BlogCard
export interface BlogCardProps {
  title: string;
  slug: string;
  content: string;
  author: string;
  reading_time_minutes: number;
  image_url?: string;
  onClick?: () => void;
}
