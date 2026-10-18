import type { ReactNode } from "react";
import DocumentLayout, { metadata as documentMetadata, viewport as documentViewport } from "@/components/document-layout";

export const metadata = documentMetadata;
export const viewport = documentViewport;

export default function RussianLayout({ children }: { children: ReactNode }) {
  return <DocumentLayout locale="ru">{children}</DocumentLayout>;
}
