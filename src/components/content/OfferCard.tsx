import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OfferCardProps } from '@/types/seo';
import { truncateText } from '@/utils/contentLoader';
import { ArrowRight, Tag } from 'lucide-react';

export const OfferCard: React.FC<OfferCardProps> = ({
  title,
  slug,
  content,
  cta,
  cta_color = 'primary',
  cta_link,
  onClick,
}) => {
  const navigate = useNavigate();
  
  const preview = truncateText(content, 150);
  const linkUrl = cta_link || `/offers/${slug}`;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/offers/${slug}`);
    }
  };
  
  return (
    <Card 
      className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 border border-slate-200/50 bg-gradient-to-br from-white to-slate-50"
    >
      {/* Header с иконкой */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-medium text-cyan-600 uppercase tracking-wider">
              Спецпредложение
            </span>
          </div>
        </div>
        <CardTitle className="text-lg font-bold text-slate-800 leading-tight mt-3">
          {title}
        </CardTitle>
      </CardHeader>
      
      {/* Content */}
      <CardContent className="flex-1 pb-4">
        <CardDescription className="text-sm text-slate-600 leading-relaxed">
          {preview}
        </CardDescription>
      </CardContent>
      
      {/* Footer с CTA */}
      <CardFooter className="pt-0">
        <Button 
          onClick={handleClick}
          className={cn(
            "w-full group",
            cta_color === 'primary' 
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20" 
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          )}
        >
          {cta}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OfferCard;
