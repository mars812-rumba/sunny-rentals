// Preserve already-shared bot URLs. Canonical URLs point into /articles/.
export const dynamic = "force-static";
export { generateStaticParams, generateMetadata, default } from "../../articles/[slug]/page";
