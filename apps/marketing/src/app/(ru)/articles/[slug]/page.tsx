import { notFound } from "next/navigation";
import { ArticleReading, articleMetadata } from "@/components/article-reading";
import { getPublishedBlogPost, loadPublishedBlogPosts } from "@/content/published-blog";

export const dynamic = "force-static";
export function generateStaticParams() {
  return loadPublishedBlogPosts("ru").map(({ slug }) => ({ slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const post = getPublishedBlogPost((await params).slug, "ru");
  return post ? articleMetadata(post) : {};
}
export default async function ArticlePage({ params }: Props) {
  const post = getPublishedBlogPost((await params).slug, "ru");
  if (!post) notFound();
  return <ArticleReading post={post} />;
}
