#!/usr/bin/env node
/**
 * Scraper OpenStreetMap (Overpass API) — gratuit, sans clé API
 * Récupère tous les équipements sportifs de Paris intra-muros.
 *
 * Usage:
 *   node scraper/scrape.js
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dir, 'spots_paris.json');

const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter';

// Paris intra-muros bounding box
const BBOX = '48.815573,2.224199,48.902145,2.469920';

// Requête Overpass : tous les noeuds/ways/relations sportifs dans Paris
const QUERY = `
[out:json][timeout:60];
(
  node["leisure"="pitch"](${BBOX});
  way["leisure"="pitch"](${BBOX});
  node["leisure"="sports_centre"](${BBOX});
  way["leisure"="sports_centre"](${BBOX});
  node["leisure"="fitness_centre"](${BBOX});
  way["leisure"="fitness_centre"](${BBOX});
  node["leisure"="swimming_pool"](${BBOX});
  way["leisure"="swimming_pool"](${BBOX});
  node["leisure"="fitness_station"](${BBOX});
  node["leisure"="skate_park"](${BBOX});
  way["leisure"="skate_park"](${BBOX});
  node["leisure"="track"](${BBOX});
  way["leisure"="track"](${BBOX});
  node["leisure"="golf_course"](${BBOX});
  way["leisure"="golf_course"](${BBOX});
  node["leisure"="ice_rink"](${BBOX});
  way["leisure"="ice_rink"](${BBOX});
  node["leisure"="climbing"](${BBOX});
  way["leisure"="climbing"](${BBOX});
  node["sport"](${BBOX});
  way["sport"](${BBOX});
  node["amenity"="swimming_pool"](${BBOX});
);
out center tags;
`;

// ── Mapping OSM → champs app ──────────────────────────────────────────────────

const SPORT_MAP = {
  football:      'football',
  soccer:        'football',
  basketball:    'basketball',
  volleyball:    'volleyball',
  handball:      'handball',
  tennis:        'tennis',
  badminton:     'badminton',
  swimming:      'natation',
  athletics:     'athlétisme',
  running:       'athlétisme',
  cycling:       'vélo',
  rugby:         'rugby',
  baseball:      'baseball',
  cricket:       'cricket',
  hockey:        'hockey',
  ice_hockey:    'hockey sur glace',
  skating:       'patinage',
  ice_skating:   'patinage',
  roller_skating:'roller',
  skateboard:    'skateboard',
  climbing:      'escalade',
  martial_arts:  'arts martiaux',
  judo:          'judo',
  karate:        'karaté',
  boxing:        'boxe',
  gym:           'musculation',
  fitness:       'fitness',
  yoga:          'yoga',
  crossfit:      'crossfit',
  dance:         'danse',
  golf:          'golf',
  boules:        'pétanque',
  bowls:         'pétanque',
  petanque:      'pétanque',
  archery:       'tir à l\'arc',
  fencing:       'escrime',
  equestrian:    'équitation',
  rowing:        'aviron',
  canoe:         'canoë',
  multi:         'multisport',
  table_tennis:  'ping-pong',
  squash:        'squash',
  padel:         'padel',
  american_football: 'football américain',
  australian_football: 'football australien',
  gaelic_football: 'football gaélique',
};

const LEISURE_SPORT_MAP = {
  pitch:          null,      // dépend du tag "sport"
  sports_centre:  'multisport',
  fitness_centre: 'musculation',
  swimming_pool:  'natation',
  fitness_station:'fitness',
  skate_park:     'skateboard',
  track:          'athlétisme',
  golf_course:    'golf',
  ice_rink:       'patinage',
  climbing:       'escalade',
};

const FREE_LEISURE = new Set(['pitch', 'fitness_station', 'skate_park', 'track']);
const PAYING_LEISURE = new Set(['sports_centre', 'fitness_centre', 'swimming_pool', 'golf_course', 'ice_rink', 'climbing']);

function parseSport(tags) {
  // tag "sport" peut contenir plusieurs valeurs séparées par ";"
  const raw = tags.sport || '';
  const parts = raw.split(';').map(s => s.trim().toLowerCase()).filter(Boolean);
  for (const p of parts) {
    if (SPORT_MAP[p]) return SPORT_MAP[p];
  }
  // fallback sur leisure
  const lsport = LEISURE_SPORT_MAP[tags.leisure];
  if (lsport) return lsport;
  if (raw) return raw.split(';')[0].trim(); // valeur brute si inconnue
  return 'multisport';
}

function parsePrice(tags) {
  if (tags.fee === 'no' || tags.access === 'yes') return 'free';
  if (tags.fee === 'yes') return 'paying';
  if (PAYING_LEISURE.has(tags.leisure)) return 'paying';
  if (FREE_LEISURE.has(tags.leisure)) return 'free';
  return 'free';
}

function parseType(tags) {
  const leisure = tags.leisure || '';
  if (['fitness_centre', 'sports_centre', 'swimming_pool', 'golf_course', 'ice_rink', 'climbing'].includes(leisure)) {
    return 'pro';
  }
  return 'fun';
}

function parseName(tags) {
  return tags.name || tags['name:fr'] || tags.official_name || null;
}

function parseAddr(tags) {
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street'])      parts.push(tags['addr:street']);
  if (tags['addr:postcode'])    parts.push(tags['addr:postcode']);
  if (tags['addr:city'])        parts.push(tags['addr:city']);
  return parts.join(' ').trim() || '';
}

function getCoords(el) {
  if (el.type === 'node') return { lat: el.lat, lng: el.lon };
  if (el.center)          return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Requête Overpass API (OpenStreetMap)…');

  const body = new URLSearchParams({ data: QUERY });
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SportMapParis/1.0 (educational project)',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Overpass error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  console.log(`${data.elements.length} éléments OSM récupérés`);

  const seen = new Set();
  const spots = [];

  for (const el of data.elements) {
    const tags = el.tags || {};
    const coords = getCoords(el);
    if (!coords) continue;

    const name = parseName(tags);
    if (!name) continue; // ignore les équipements sans nom

    // Déduplication par nom + position approchée
    const key = `${name}|${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    spots.push({
      name,
      lat:         coords.lat,
      lng:         coords.lng,
      type:        parseType(tags),
      price:       parsePrice(tags),
      sport:       parseSport(tags),
      description: tags.description || '',
      addr:        parseAddr(tags),
      status:      'approved',
    });
  }

  // Tri par nom
  spots.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  writeFileSync(OUT_FILE, JSON.stringify(spots, null, 2), 'utf8');
  console.log(`\n✅  ${spots.length} spots sauvegardés → ${OUT_FILE}`);

  // Stats par sport
  const stats = {};
  for (const s of spots) stats[s.sport] = (stats[s.sport] || 0) + 1;
  const top = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop sports :');
  for (const [sport, count] of top) console.log(`  ${count.toString().padStart(3)}  ${sport}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
