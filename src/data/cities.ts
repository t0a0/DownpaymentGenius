// City presets. Each sets the state (GrESt, church tax rate) and default price and rent growth; €/m² values are
// rounded typical levels for existing flats/houses (GREIX, Destatis, 2025–26) and only serve as hints.

import type { StateCode } from '../engine';

export interface CityPreset {
  id: string;
  state: StateCode;
  priceGrowth: number;
  rentGrowth: number;
  /** typical purchase price, €/m² */
  pricePerM2: { apartment: number; house: number };
  /** typical cold rent for a new lease, €/m²/month */
  rentPerM2: number;
}

export const CITIES: CityPreset[] = [
  { id: 'berlin', state: 'BE', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 4900, house: 4600 }, rentPerM2: 15.5 },
  { id: 'muenchen', state: 'BY', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 8000, house: 9000 }, rentPerM2: 22 },
  { id: 'hamburg', state: 'HH', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 5600, house: 5400 }, rentPerM2: 15 },
  { id: 'koeln', state: 'NW', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 4600, house: 4500 }, rentPerM2: 14 },
  { id: 'frankfurt', state: 'HE', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 5500, house: 5800 }, rentPerM2: 17 },
  { id: 'stuttgart', state: 'BW', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 4900, house: 5500 }, rentPerM2: 16 },
  { id: 'duesseldorf', state: 'NW', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 4700, house: 4800 }, rentPerM2: 13.5 },
  { id: 'leipzig', state: 'SN', priceGrowth: 2.5, rentGrowth: 3, pricePerM2: { apartment: 2600, house: 3000 }, rentPerM2: 9 },
  { id: 'dresden', state: 'SN', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 2800, house: 3400 }, rentPerM2: 9.5 },
  { id: 'hannover', state: 'NI', priceGrowth: 2.0, rentGrowth: 2.5, pricePerM2: { apartment: 3300, house: 3500 }, rentPerM2: 11 },
  { id: 'nuernberg', state: 'BY', priceGrowth: 2.5, rentGrowth: 2.5, pricePerM2: { apartment: 3900, house: 4300 }, rentPerM2: 12.5 },
  { id: 'bremen', state: 'HB', priceGrowth: 2.0, rentGrowth: 2.0, pricePerM2: { apartment: 2800, house: 3000 }, rentPerM2: 10.5 },
  { id: 'other', state: 'NW', priceGrowth: 2.0, rentGrowth: 2.0, pricePerM2: { apartment: 2600, house: 2500 }, rentPerM2: 9 },
];

export const cityById = (id: string): CityPreset => CITIES.find((c) => c.id === id) ?? CITIES[CITIES.length - 1];

export const CITY_NAMES: Record<string, { en: string; de: string }> = {
  berlin: { en: 'Berlin', de: 'Berlin' },
  muenchen: { en: 'Munich', de: 'München' },
  hamburg: { en: 'Hamburg', de: 'Hamburg' },
  koeln: { en: 'Cologne', de: 'Köln' },
  frankfurt: { en: 'Frankfurt', de: 'Frankfurt am Main' },
  stuttgart: { en: 'Stuttgart', de: 'Stuttgart' },
  duesseldorf: { en: 'Düsseldorf', de: 'Düsseldorf' },
  leipzig: { en: 'Leipzig', de: 'Leipzig' },
  dresden: { en: 'Dresden', de: 'Dresden' },
  hannover: { en: 'Hanover', de: 'Hannover' },
  nuernberg: { en: 'Nuremberg', de: 'Nürnberg' },
  bremen: { en: 'Bremen', de: 'Bremen' },
  other: { en: 'Germany / other', de: 'Deutschland / andere' },
};

export const STATE_NAMES: Record<StateCode, { en: string; de: string }> = {
  BW: { en: 'Baden-Württemberg', de: 'Baden-Württemberg' },
  BY: { en: 'Bavaria', de: 'Bayern' },
  BE: { en: 'Berlin', de: 'Berlin' },
  BB: { en: 'Brandenburg', de: 'Brandenburg' },
  HB: { en: 'Bremen', de: 'Bremen' },
  HH: { en: 'Hamburg', de: 'Hamburg' },
  HE: { en: 'Hesse', de: 'Hessen' },
  MV: { en: 'Mecklenburg-Vorpommern', de: 'Mecklenburg-Vorpommern' },
  NI: { en: 'Lower Saxony', de: 'Niedersachsen' },
  NW: { en: 'North Rhine-Westphalia', de: 'Nordrhein-Westfalen' },
  RP: { en: 'Rhineland-Palatinate', de: 'Rheinland-Pfalz' },
  SL: { en: 'Saarland', de: 'Saarland' },
  SN: { en: 'Saxony', de: 'Sachsen' },
  ST: { en: 'Saxony-Anhalt', de: 'Sachsen-Anhalt' },
  SH: { en: 'Schleswig-Holstein', de: 'Schleswig-Holstein' },
  TH: { en: 'Thuringia', de: 'Thüringen' },
};
