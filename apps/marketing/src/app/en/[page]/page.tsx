import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createTrustPageMetadata, TrustPageLanding } from "@/components/trust-page-landing";
import { getTrustPage, trustPageSlugs } from "@/content/trust-pages";

type PageProps = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return trustPageSlugs.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page: slug } = await params;
  const page = getTrustPage(slug, "en");
  return page ? createTrustPageMetadata(page, "en") : {};
}

export default async function EnglishTrustPage({ params }: PageProps) {
  const { page: slug } = await params;
  const page = getTrustPage(slug, "en");
  if (!page) notFound();
  return <TrustPageLanding page={page} locale="en" />;
}
