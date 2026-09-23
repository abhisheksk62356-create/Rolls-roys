"use client";

import { craftChapter, finaleChapter, ghostChapter, spectreChapter } from "./scripts";
import { CinematicChapter } from "./CinematicChapter";

export const GhostCinema = () => <CinematicChapter config={ghostChapter} />;
export const SpectreCinema = () => <CinematicChapter config={spectreChapter} />;
export const CraftCinema = () => <CinematicChapter config={craftChapter} />;
export const FinaleCinema = () => <CinematicChapter config={finaleChapter} />;
