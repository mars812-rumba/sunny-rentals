import type { ReactNode } from "react";
import DocumentLayout, { metadata as documentMetadata, viewport as documentViewport } from "@/components/document-layout";

export const metadata = documentMetadata;
export const viewport = documentViewport;

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <DocumentLayout locale="en">{children}</DocumentLayout>;
}
