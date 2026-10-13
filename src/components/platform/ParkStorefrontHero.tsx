export function ParkStorefrontHero({ name }: { name: string }) {
  return <section className="bg-gradient-to-r from-cyan-800 via-blue-800 to-blue-950 text-white">
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 text-left sm:px-6 sm:pt-12 lg:px-8">
      <h1 className="break-words text-3xl font-bold leading-tight sm:text-4xl">{name}</h1>
    </div>
  </section>;
}
