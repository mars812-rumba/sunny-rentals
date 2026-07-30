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
import { getBlogPost, getAllBlogPosts } from "@/utils/contentLoader";
import { BlogData } from "@/types/seo";
import { ArrowLeft, Clock, User, Calendar, Loader2, ExternalLink, Car } from "lucide-react";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [blog, setBlog] = useState<BlogData | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlog = async () => {
      if (!slug) {
        setError('Не указан slug статьи');
        setLoading(false);
        return;
      }
      
      try {
        const data = await getBlogPost(slug);
        if (!data) {
          setError('Статья не найдена');
        } else {
          setBlog(data);
          
          // Загружаем похожие статьи
          const allBlogs = await getAllBlogPosts();
          const related = allBlogs
            .filter(b => b.slug !== slug)
            .slice(0, 3);
          setRelatedPosts(related);
        }
      } catch (err) {
        console.error('Error loading blog:', err);
        setError('Ошибка загрузки статьи');
      } finally {
        setLoading(false);
      }
    };
    loadBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Header />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Ошибка</h1>
          <p className="text-slate-600 mb-8">{error || 'Статья не найдена'}</p>
          <Button onClick={() => navigate('/blog')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к блогу
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Helmet>
        <title>{blog.title} | Sunny Rentals</title>
        <meta name="description" content={blog.meta_description} />
        <meta name="keywords" content={blog.meta_keywords.join(', ')} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.meta_description} />
        {blog.image_url && <meta property="og:image" content={blog.image_url} />}
        <meta property="og:type" content="article" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Button 
          onClick={() => navigate('/blog')} 
          variant="ghost" 
          className="mb-6 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Все статьи
        </Button>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Article Column */}
          <div className="lg:col-span-2">
            {/* Article Header */}
            <div className="mb-8">
              {/* Category Badge */}
              <Badge variant="secondary" className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
                Статья
              </Badge>
              
              <h1 className="text-4xl font-bold text-slate-800 mb-4 leading-tight">
                {blog.title}
              </h1>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{blog.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{blog.reading_time_minutes} мин чтения</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(blog.generated_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            {blog.image_url && (
              <div className="mb-8 rounded-2xl overflow-hidden">
                <img 
                  src={blog.image_url} 
                  alt={blog.title}
                  className="w-full h-auto object-cover max-h-[500px]"
                />
              </div>
            )}

            {/* Article Content */}
            <Card className="mb-8 overflow-hidden">
              <CardContent className="p-8">
                <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {blog.content}
                  </ReactMarkdown>
                </article>
              </CardContent>
            </Card>

            {/* Bottom CTA */}
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 mb-8">
              <CardContent className="p-8 text-center">
                <Car className="w-12 h-12 text-white/80 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-3">
                  {blog.cta_text || 'Нужна машина для путешествий?'}
                </h2>
                <p className="text-blue-100 mb-6 max-w-xl mx-auto">
                  Исследуйте Пхукет на арендованном автомобиле — это просто, удобно и выгодно!
                </p>
                <Button 
                  onClick={() => window.open('https://t.me/webapp_rent_bot', '_blank')}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 rounded-full shadow-lg transition-all hover:shadow-xl"
                >
                  Арендовать авто
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                    Другие статьи
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((post) => (
                      <button
                        key={post.slug}
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <h4 className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                          {post.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {post.reading_time_minutes} мин чтения
                        </p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <Button 
                      onClick={() => navigate('/blog')}
                      variant="outline" 
                      className="w-full"
                    >
                      Все статьи
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
