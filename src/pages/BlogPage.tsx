import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BlogCard } from "@/components/content/BlogCard";
import { getAllBlogPosts, clearContentCache } from "@/utils/contentLoader";
import { BlogData } from "@/types/seo";
import { Loader2, BookOpen } from "lucide-react";

export default function BlogPage() {
  const [blogs, setBlogs] = useState<BlogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        clearContentCache();
        const data = await getAllBlogPosts();
        setBlogs(data);
      } catch (err) {
        console.error('Error loading blogs:', err);
        setError('Ошибка загрузки статей');
      } finally {
        setLoading(false);
      }
    };
    loadBlogs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Helmet>
        <title>Блог | Sunny Rentals</title>
        <meta 
          name="description" 
          content="Полезные статьи об аренде авто на Пхукете. Советы, лайфхаки и интересные места Таиланда от команды Sunny Rentals." 
        />
        <meta name="keywords" content="блог аренда авто пхукет, советы пхукет, путешествия таиланд" />
        <meta property="og:title" content="Блог | Sunny Rentals" />
        <meta property="og:description" content="Полезные статьи об аренде авто на Пхукете" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-4">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Блог</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Полезные статьи
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Советы, лайфхаки и интересные места для путешествий по Пхукету и Таиланду. 
            Узнайте больше о жизни на острове и аренде авто!
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && blogs.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">
              Пока нет статей
            </h2>
            <p className="text-slate-500">
              Скоро здесь появятся интересные материалы!
            </p>
          </div>
        )}

        {/* Blog Grid */}
        {!loading && !error && blogs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <BlogCard
                key={blog.slug}
                title={blog.title}
                slug={blog.slug}
                content={blog.content}
                author={blog.author}
                reading_time_minutes={blog.reading_time_minutes}
                image_url={blog.image_url}
              />
            ))}
          </div>
        )}

        {/* CTA Section */}
        {!loading && !error && blogs.length > 0 && (
          <div className="mt-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Нужна машина для путешествий?</h2>
            <p className="text-blue-100 mb-6">
              Исследуйте остров на арендованном автомобиле — это просто и удобно!
            </p>
            <a
              href="https://t.me/webapp_rent_bot"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-full hover:bg-blue-50 transition-colors"
            >
              Забронировать авто
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
