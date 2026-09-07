/**
 * Turning a Cloudflare edge code into a place a reader recognizes.
 *
 * The checker records the colo it ran in, which is an IATA airport code —
 * Cloudflare names its locations after the nearest airport. `CDG` says nothing
 * to anyone who does not already know that, and worse, it invites a reader to
 * think it describes where Marfa is hosted rather than where the observation
 * was made from.
 *
 * The map is deliberately partial. Cloudflare adds locations continually and
 * an exhaustive list here would be wrong within months, so anything unmapped
 * falls through to the code itself. That is the behavior the page had before
 * this module existed, which makes an unfamiliar edge a mild regression in
 * wording rather than a blank space or a thrown error.
 *
 * Imported only from `state.ts`, which is reached through a server function, so
 * the table is resolved during the render and never ships to the browser.
 */
const CITIES: Record<string, string> = {
  // Europe
  AMS: 'Amsterdam', ARN: 'Stockholm', ATH: 'Athens', BCN: 'Barcelona',
  BEG: 'Belgrade', BER: 'Berlin', BRU: 'Brussels', BTS: 'Bratislava',
  BUD: 'Budapest', CDG: 'Paris', CPH: 'Copenhagen', DUB: 'Dublin',
  DUS: 'Düsseldorf', EDI: 'Edinburgh', FCO: 'Rome', FRA: 'Frankfurt',
  GOT: 'Gothenburg', GVA: 'Geneva', HAM: 'Hamburg', HEL: 'Helsinki',
  IST: 'Istanbul', KEF: 'Reykjavík', KIV: 'Chișinău', KRK: 'Kraków',
  LCY: 'London', LHR: 'London', LIS: 'Lisbon', LJU: 'Ljubljana',
  LUX: 'Luxembourg', LYS: 'Lyon', MAD: 'Madrid', MAN: 'Manchester',
  MLA: 'Malta', MRS: 'Marseille', MUC: 'Munich', MXP: 'Milan',
  OSL: 'Oslo', OTP: 'Bucharest', PMO: 'Palermo', PRG: 'Prague',
  RIX: 'Riga', SJJ: 'Sarajevo', SKG: 'Thessaloniki', SKP: 'Skopje',
  SOF: 'Sofia', STR: 'Stuttgart', TGD: 'Podgorica', TIA: 'Tirana',
  TLL: 'Tallinn', VIE: 'Vienna', VNO: 'Vilnius', WAW: 'Warsaw',
  ZAG: 'Zagreb', ZRH: 'Zurich',

  // North America
  ABQ: 'Albuquerque', ANC: 'Anchorage', ATL: 'Atlanta', BNA: 'Nashville',
  BOS: 'Boston', BUF: 'Buffalo', CLE: 'Cleveland', CLT: 'Charlotte',
  CMH: 'Columbus', DEN: 'Denver', DFW: 'Dallas', DTW: 'Detroit',
  EWR: 'Newark', HNL: 'Honolulu', IAD: 'Ashburn', IAH: 'Houston',
  IND: 'Indianapolis', JFK: 'New York', LAS: 'Las Vegas', LAX: 'Los Angeles',
  MCI: 'Kansas City', MCO: 'Orlando', MEM: 'Memphis', MIA: 'Miami',
  MSP: 'Minneapolis', OMA: 'Omaha', ORD: 'Chicago', PDX: 'Portland',
  PHL: 'Philadelphia', PHX: 'Phoenix', PIT: 'Pittsburgh', RDU: 'Raleigh',
  RIC: 'Richmond', SAN: 'San Diego', SEA: 'Seattle', SFO: 'San Francisco',
  SJC: 'San Jose', SLC: 'Salt Lake City', STL: 'St Louis', TPA: 'Tampa',
  YHZ: 'Halifax', YOW: 'Ottawa', YUL: 'Montréal', YVR: 'Vancouver',
  YWG: 'Winnipeg', YYC: 'Calgary', YYZ: 'Toronto',
  GDL: 'Guadalajara', MEX: 'Mexico City', QRO: 'Querétaro',

  // South and Central America
  ASU: 'Asunción', BOG: 'Bogotá', BSB: 'Brasília', CCS: 'Caracas',
  CWB: 'Curitiba', EZE: 'Buenos Aires', FOR: 'Fortaleza', GIG: 'Rio de Janeiro',
  GRU: 'São Paulo', LIM: 'Lima', LPB: 'La Paz', MDE: 'Medellín',
  MVD: 'Montevideo', POA: 'Porto Alegre', PTY: 'Panama City', REC: 'Recife',
  SCL: 'Santiago', SJO: 'San José', UIO: 'Quito',

  // Asia
  AMD: 'Ahmedabad', BKK: 'Bangkok', BLR: 'Bangalore', BOM: 'Mumbai',
  CAN: 'Guangzhou', CCU: 'Kolkata', CGK: 'Jakarta', CMB: 'Colombo',
  COK: 'Kochi', DAC: 'Dhaka', DEL: 'Delhi', HAN: 'Hanoi',
  HKG: 'Hong Kong', HND: 'Tokyo', HYD: 'Hyderabad', ICN: 'Seoul',
  ISB: 'Islamabad', ITM: 'Osaka', KHI: 'Karachi', KIX: 'Osaka',
  KTM: 'Kathmandu', KUL: 'Kuala Lumpur', LHE: 'Lahore', MAA: 'Chennai',
  MLE: 'Malé', MNL: 'Manila', NRT: 'Tokyo', PEK: 'Beijing',
  PNH: 'Phnom Penh', PVG: 'Shanghai', RGN: 'Yangon', SGN: 'Ho Chi Minh City',
  SIN: 'Singapore', SZX: 'Shenzhen', TPE: 'Taipei', VTE: 'Vientiane',

  // Middle East, Caucasus and Central Asia
  ALA: 'Almaty', AMM: 'Amman', AUH: 'Abu Dhabi', BAH: 'Bahrain',
  BEY: 'Beirut', BGW: 'Baghdad', DME: 'Moscow', DOH: 'Doha',
  DXB: 'Dubai', EVN: 'Yerevan', GYD: 'Baku', JED: 'Jeddah',
  KBP: 'Kyiv', KWI: 'Kuwait City', LED: 'St Petersburg', MCT: 'Muscat',
  MSQ: 'Minsk', RUH: 'Riyadh', SVO: 'Moscow', TAS: 'Tashkent',
  TBS: 'Tbilisi', TLV: 'Tel Aviv',

  // Africa
  ABJ: 'Abidjan', ACC: 'Accra', ADD: 'Addis Ababa', ALG: 'Algiers',
  CAI: 'Cairo', CMN: 'Casablanca', CPT: 'Cape Town', DAR: 'Dar es Salaam',
  DKR: 'Dakar', DUR: 'Durban', GBE: 'Gaborone', HRE: 'Harare',
  JNB: 'Johannesburg', KGL: 'Kigali', LAD: 'Luanda', LOS: 'Lagos',
  MPM: 'Maputo', MRU: 'Mauritius', NBO: 'Nairobi', RAK: 'Marrakesh',
  RUN: 'Réunion', TNR: 'Antananarivo', TUN: 'Tunis', WDH: 'Windhoek',

  // Oceania
  ADL: 'Adelaide', AKL: 'Auckland', BNE: 'Brisbane', CBR: 'Canberra',
  CHC: 'Christchurch', GUM: 'Guam', HBA: 'Hobart', MEL: 'Melbourne',
  NAN: 'Nadi', NOU: 'Nouméa', PER: 'Perth', POM: 'Port Moresby',
  SYD: 'Sydney', WLG: 'Wellington',
};

/**
 * A place name for a colo code, or the code itself.
 *
 * `ERROR` is the checker's own value for a check whose location it could not
 * determine, and it is the one code that must not be printed: "measured from
 * ERROR" reads as a failure of the thing being measured. Null instead, which
 * the caller renders as no location at all.
 */
export function resolveLocation(colo: string | null): string | null {
  if (!colo) return null;
  const code = colo.trim().toUpperCase();
  if (code === '' || code === 'ERROR') return null;
  return CITIES[code] ?? code;
}
