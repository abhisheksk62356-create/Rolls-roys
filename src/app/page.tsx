import { BlackBadge } from "@/components/BlackBadge";
import { CraftCinema, FinaleCinema, GhostCinema, SpectreCinema } from "@/components/cinema/Chapters";
import { CullinanChapter } from "@/components/CullinanChapter";
import { FilmSequence } from "@/components/film/FilmSequence";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";
import { Heritage } from "@/components/Heritage";
import { Loader } from "@/components/Loader";
import { ModelsIndex } from "@/components/ModelsIndex";
import { Navbar } from "@/components/Navbar";
import { PhantomChapter } from "@/components/PhantomChapter";
import { Providers } from "@/components/providers/Providers";
import { ScrollEffects } from "@/components/ScrollEffects";
import { Cursor } from "@/components/ui/Cursor";
import { getMediaAvailability } from "@/lib/media-server";

export default function Home() {
  const available = getMediaAvailability();

  return (
    <Providers available={available}>
      <a
        href="#main"
        className="type-micro fixed left-4 top-4 z-[110] -translate-y-24 bg-ivory px-5 py-4 text-obsidian transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Loader />
      <Navbar />
      <main id="main">
        <FilmSequence />
        <ModelsIndex />
        <PhantomChapter />
        <GhostCinema />
        <CullinanChapter />
        <SpectreCinema />
        <BlackBadge />
        <CraftCinema />
        <Heritage />
        <Gallery />
        <FinaleCinema />
      </main>
      <Footer />
      <ScrollEffects />
      <Cursor />
    </Providers>
  );
}
