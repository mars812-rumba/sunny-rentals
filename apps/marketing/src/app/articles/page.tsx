import { ArticlesIndex, createArticlesMetadata } from "@/components/articles-index";

export const metadata = createArticlesMetadata("ru");

export default function ArticlesPage() {
  return <ArticlesIndex locale="ru" />;
}
