import { ArticlesIndex, createArticlesMetadata } from "@/components/articles-index";

export const metadata = createArticlesMetadata("en");

export default function ArticlesPage() {
  return <ArticlesIndex locale="en" />;
}
