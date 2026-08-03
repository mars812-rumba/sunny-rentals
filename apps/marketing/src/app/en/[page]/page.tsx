import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createTrustPageMetadata, TrustPageLanding } from "@/components/trust-page-landing";
import { contentPageSlugs, getContentPage } from "@/content/content-pages";

type PageProps = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return contentPageSlugs.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: slug } = await params;
  const page = getContentPage(slug, "en");
  return page ? createTrustPageMetadata(page, "en") : {};
}

export default async function EnglishTrustPage({ params }: PageProps) {
  const { page: slug } = await params;
  const page = getContentPage(slug, "en");
  if (!page) notFound();
  return <TrustPageLanding page={page} locale="en" />;
}
