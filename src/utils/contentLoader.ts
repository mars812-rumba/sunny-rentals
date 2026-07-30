/**
 * Content Loader Utility
 * Утилита для загрузки SEO-контента из JSON файлов
 */

import { OfferData, BlogData, UrlParams } from '@/types/seo';

// Кеш для хранения данных
let offersCache: OfferData[] | null = null;
let blogsCache: BlogData[] | null = null;

/**
 * Генерирует URL для бронирования на основе параметров
 */
export function generateBookingUrl(params: UrlParams): string {
  const baseUrl = 'https://t.me/webapp_rent_bot';
  const searchParams = new URLSearchParams();
  
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.location) searchParams.set('location', params.location);
  if (params.car_type) searchParams.set('car_type', params.car_type);
  if (params.utm_source) searchParams.set('utm_source', params.utm_source);
  if (params.utm_medium) searchParams.set('utm_medium', params.utm_medium);
  
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Обрезает текст до нужной длины
 */
export function truncateText(text: string, maxLength: number): string {
  // Убираем Markdown разметку для предпросмотра
  const plainText = text
    .replace(/#{1,6}\s/g, '') // заголовки
    .replace(/\*\*/g, '') // жирный текст
    .replace(/\*/g, '') // курсив
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // ссылки
    .replace(/`[^`]+`/g, '') // код
    .replace(/\n+/g, ' ') // переносы строк
    .trim();
  
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + '...';
}

/**
 * Загружает один оффер по slug
 */
export async function getOffer(slug: string): Promise<OfferData | null> {
  try {
    const response = await fetch(`/content/offers/${slug}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    return data as OfferData;
  } catch (error) {
    console.error(`Error loading offer ${slug}:`, error);
    return null;
  }
}

/**
 * Загружает все офферы
 */
export async function getAllOffers(): Promise<OfferData[]> {
  if (offersCache) return offersCache;
  
  try {
    // Загружаем index.json с массивом slug-ов
    const indexResponse = await fetch('/content/offers/index.json');
    if (!indexResponse.ok) {
      console.error('Failed to load offers index.json');
      return [];
    }
    const slugs: string[] = await indexResponse.json();
    
    if (!Array.isArray(slugs) || slugs.length === 0) {
      offersCache = [];
      return [];
    }
    
    // Загружаем все офферы параллельно
    const offers = await Promise.all(
      slugs.map(async (slug: string) => {
        try {
          const res = await fetch(`/content/offers/${slug}.json`);
          if (res.ok) {
            return await res.json() as OfferData;
          }
        } catch (e) {
          console.error(`Error loading offer ${slug}:`, e);
        }
        return null;
      })
    );
    
    const validOffers = offers.filter(Boolean) as OfferData[];
    offersCache = validOffers;
    return validOffers;
  } catch (error) {
    console.error('Error loading offers:', error);
    return [];
  }
}

/**
 * Загружает одну статью блога по slug
 */
export async function getBlogPost(slug: string): Promise<BlogData | null> {
  try {
    const response = await fetch(`/content/blog/${slug}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    return data as BlogData;
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Загружает все статьи блога
 */
export async function getAllBlogPosts(): Promise<BlogData[]> {
  if (blogsCache) return blogsCache;
  
  try {
    // Загружаем index.json с массивом slug-ов
    const indexResponse = await fetch('/content/blog/index.json');
    if (!indexResponse.ok) {
      console.error('Failed to load blog index.json');
      return [];
    }
    const slugs: string[] = await indexResponse.json();
    
    if (!Array.isArray(slugs) || slugs.length === 0) {
      blogsCache = [];
      return [];
    }
    
    // Загружаем все статьи параллельно
    const blogs = await Promise.all(
      slugs.map(async (slug: string) => {
        try {
          const res = await fetch(`/content/blog/${slug}.json`);
          if (res.ok) {
            return await res.json() as BlogData;
          }
        } catch (e) {
          console.error(`Error loading blog post ${slug}:`, e);
        }
        return null;
      })
    );
    
    const validBlogs = blogs.filter(Boolean) as BlogData[];
    blogsCache = validBlogs;
    return validBlogs;
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return [];
  }
}

/**
 * Очищает кеш
 */
export function clearContentCache(): void {
  offersCache = null;
  blogsCache = null;
}
