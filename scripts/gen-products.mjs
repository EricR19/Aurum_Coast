#!/usr/bin/env node
/**
 * gen-products.mjs - Genera 6 imagenes de relojes y las guarda en public/watches/<slug>/1.webp
 *
 * Uso: node scripts/gen-products.mjs
 * Reutiliza IMAGE_API_TOKEN de .env.local.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, 'public', 'watches');

// Carga .env.local sin dotenv (0 deps).
try {
  const envText = await fs.readFile(path.resolve(ROOT, '.env.local'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, key, raw] = m;
    if (!process.env[key]) {
      process.env[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  // .env.local no existe -> seguimos con variables del entorno
}

const TOKEN = process.env.IMAGE_API_TOKEN;
if (!TOKEN) {
  console.error('ERROR: IMAGE_API_TOKEN no esta en .env.local');
  process.exit(1);
}

const PRODUCTS = [
  { slug: 'invicta-pro-diver', label: 'Invicta Pro Diver', prompt: 'Professional product photograph of an Invicta Pro Diver automatic watch on a clean soft gray gradient studio background. Round polished stainless steel case 42mm, deep blue sunray dial with applied luminous hour markers, unidirectional rotating steel bezel with blue insert, stainless steel oyster bracelet. Studio lighting from upper-left with soft shadows, sharp focus on dial. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
  { slug: 'citizen-eco-drive', label: 'Citizen Eco-Drive Pilot', prompt: 'Professional product photograph of a Citizen Eco-Drive pilot watch on a solid matte black background. Round brushed stainless steel case 42mm, black dial with large Arabic numerals in vintage military style at 12, 3, 6, 9, day-date window at 3 oclock, olive green canvas NATO strap. Studio lighting with soft top-down key light, subtle rim light on the case edge. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
  { slug: 'fossil-grant', label: 'Fossil Grant', prompt: 'Professional product photograph of a Fossil Grant minimalist dress watch on a soft cream gradient studio background. Slim round polished rose-gold case 40mm, clean white dial with thin black Roman numerals, sub-seconds dial at 6 oclock, dark brown genuine leather strap with cream stitching. Studio lighting from upper-right with warm tone. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
  { slug: 'orient-bambino', label: 'Orient Bambino', prompt: 'Professional product photograph of an Orient Bambino automatic dress watch on a solid deep navy gradient background. Round polished stainless steel case 40mm, domed cream dial with blue sword-shaped hands, applied polished markers, small date window at 6 oclock, dark brown leather strap with croc-pattern texture. Studio lighting from upper-left with warm tone. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
  { slug: 'bulova-classic', label: 'Bulova Classic', prompt: 'Professional product photograph of a Bulova Classic slim dress watch on a soft charcoal gradient studio background. Ultra-thin round polished stainless steel case 38mm with stepped bezel, textured silver-white dial with applied gold-tone markers, slim gold-tone hands, no date window, black genuine leather alligator-pattern strap. Studio lighting from upper-left with cool tone. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
  { slug: 'hamilton-khaki', label: 'Hamilton Khaki Field', prompt: 'Professional product photograph of a Hamilton Khaki Field mechanical watch on a solid matte olive green background. Round brushed stainless steel case 38mm, matte black dial with high-contrast white Arabic numerals, railroad minute track, no date window, olive drab nylon NATO strap. Studio lighting with soft top-down key light. Centered composition, watch occupies 70 percent of the frame. Photorealistic, e-commerce style, no text. --ar 1:1.' },
];

async function genOne(slug, prompt) {
  const dir = path.join(OUT, slug);
  await fs.mkdir(dir, { recursive: true });
  const outFile = path.join(dir, '1.jpg');

  const res = await fetch('https://api.minimax.io/v1/image_generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt,
      aspect_ratio: '1:1',
      response_format: 'url',
      n: 1,
    }),
  });
  if (!res.ok) {
    throw new Error('API ' + res.status + ': ' + (await res.text()).slice(0, 200));
  }
  const json = await res.json();
  const url = json.data?.[0]?.url || json.data?.image_urls?.[0] || json.image_urls?.[0];
  if (!url) throw new Error('Sin URL en respuesta');

  const dl = await fetch(url);
  if (!dl.ok) throw new Error('Download ' + dl.status);
  const buf = Buffer.from(await dl.arrayBuffer());
  await fs.writeFile(outFile, buf);
  return outFile + ' (' + buf.length + ' bytes)';
}

let ok = 0;
for (const p of PRODUCTS) {
  try {
    process.stdout.write('[' + p.slug + '] ');
    const r = await genOne(p.slug, p.prompt);
    console.log('OK ' + r);
    ok += 1;
  } catch (err) {
    console.log('ERROR ' + err.message);
  }
}
console.log('\nListo. ' + ok + '/' + PRODUCTS.length + ' generadas.');
