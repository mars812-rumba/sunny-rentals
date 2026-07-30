import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createVehicleMetadata,
  VehicleLanding,
} from "@/components/vehicle-landing";
import { getCarBySlug, marketingCars } from "@/content/cars";

type CarPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return marketingCars.map((car) => ({ slug: car.slug }));
}

export async function generateMetadata({ params }: CarPageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = getCarBySlug(slug);
  return car ? createVehicleMetadata(car, "en") : {};
}

export default async function EnglishCarPage({ params }: CarPageProps) {
  const { slug } = await params;
  const car = getCarBySlug(slug);

  if (!car) notFound();

  return <VehicleLanding car={car} locale="en" />;
}
