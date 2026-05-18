#!/usr/bin/env node
/**
 * Importe spots_paris.json dans la D1 Cloudflare via wrangler.
 *
 * Usage:
 *   node scraper/import_to_db.js [--remote]
 *
 *   --remote  : écrit dans la base déployée (prod)
 *   (rien)    : écrit dans la base locale de dev
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const JSON_FILE = join(__dir, 'spots_paris.json');
const SQL_FILE  = join(__dir, 'spots_paris.sql');

const isRemote = process.argv.includes('--remote');

// ── Lecture du JSON ───────────────────────────────────────────────────────────
let spots;
try {
  spots = JSON.parse(readFileSync(JSON_FILE, 'utf8'));
} catch {
  console.error(`❌  Fichier introuvable : ${JSON_FILE}`);
  console.error('    Lance d\'abord : GOOGLE_API_KEY=xxx node scraper/scrape.js');
  process.exit(1);
}

if (!spots.length) {
  console.log('Aucun spot à importer.');
  process.exit(0);
}

// ── Génération du SQL ─────────────────────────────────────────────────────────
function esc(v) {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

const lines = spots.map(s =>
  `INSERT OR IGNORE INTO spots (name, lat, lng, type, price, sport, description, addr, has_photo, status) ` +
  `VALUES (${esc(s.name)}, ${s.lat}, ${s.lng}, ${esc(s.type)}, ${esc(s.price)}, ${esc(s.sport)}, ${esc(s.description)}, ${esc(s.addr)}, 0, ${esc(s.status)});`
);

writeFileSync(SQL_FILE, lines.join('\n') + '\n', 'utf8');
console.log(`📝  Fichier SQL généré : ${SQL_FILE} (${spots.length} lignes)`);

// ── Exécution via wrangler ────────────────────────────────────────────────────
const remoteFlag = isRemote ? '--remote' : '--local';
const cmd = `wrangler d1 execute sportmap-db ${remoteFlag} --file="${SQL_FILE}"`;

console.log(`\n🚀  Exécution : ${cmd}\n`);
try {
  execSync(cmd, { stdio: 'inherit', cwd: join(__dir, '..') });
  console.log(`\n✅  ${spots.length} spots importés avec succès.`);
} catch (e) {
  console.error('\n❌  Erreur wrangler :', e.message);
  process.exit(1);
} finally {
  try { unlinkSync(SQL_FILE); } catch {} // nettoyage fichier tmp
}
