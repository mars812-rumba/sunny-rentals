import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BlogCardProps } from '@/types/seo';
import { truncateText } from '@/utils/contentLoader';
import { ArrowRight, Clock, User } from 'lucide-react';

export const BlogCard: React.FC<BlogCardProps> = ({
  title,
  slug,
  content,
  author,
  reading_time_minutes,
  image_url,
  onClick,
}) => {
  const navigate = useNavigate();
  
  const preview = truncateText(content, 200);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/blog/${slug}`);
    }
  };
  
  return (
    <Card 
      className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 border border-slate-200/50 bg-gradient-to-br from-white to-slate-50"
    >
      {/* Image (если есть) */}
      {image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={image_url} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      
      {/* Header */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-slate-800 leading-tight">
          {title}
        </CardTitle>
        
        {/* Мета информация */}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{reading_time_minutes} мин</span>
          </div>
        </div>
      </CardHeader>
      
      {/* Content */}
      <CardContent className="flex-1 pb-3">
        <CardDescription className="text-sm text-slate-600 leading-relaxed">
          {preview}
        </CardDescription>
      </CardContent>
      
      {/* Footer */}
      <CardFooter className="pt-0">
        <Button 
          onClick={handleClick}
          variant="outline"
          className={cn(
            "w-full group border-2 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50"
          )}
        >
          Читать далее
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BlogCard;
