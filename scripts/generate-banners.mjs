#!/usr/bin/env node
/**
 * generate-banners.mjs
 *
 * Genera el logo oficial de AURUM COAST usando la API de MiniMax (image-01)
 * y lo guarda en `public/banners/logo.{ext}`.
 *
 * Uso:
 *   1. Agregar al `.env.local` (NO commitear):
 *        IMAGE_API_TOKEN=tu_token_aqui
 *      (Alternativamente: export IMAGE_API_TOKEN=... antes de correr.)
 *   2. `node scripts/generate-banners.mjs`
 *   3. Las imagenes quedan en `public/banners/logo-1.jpeg`, `logo-2.jpeg`,
 *      `logo-3.jpeg` (o `.webp` si tenes `sharp` instalado).
 *
 * Notas:
 *  - La API devuelve URLs firmadas (response_format="url"). Las descargamos
 *    a disco para que Next/Image la sirva en build.
 *  - `sharp` (opcional) convierte el resultado a WebP. Si no esta instalado,
 *    el script guarda el binario original con su extension.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'banners');
const ENDPOINT = 'https://api.minimax.io/v1/image_generation';
const MODEL = 'image-01';

/** @type {{slug: string, label: string, prompt: string, aspect_ratio: '16:9'}[]} */
const BANNERS = [
  {
    slug: 'logo',
    label: 'Logo AURUM COAST',
    prompt:
      "Studio-quality brand logo on a solid matte black background. CENTERED ICON at the top: a perfectly symmetrical HOURGLASS — two triangles meeting exactly at a thin center waist, with thin horizontal caps at top and bottom. The hourglass is enclosed inside a COMPLETE closed circular crest (a thin continuous ring, no breaks, no gaps). BELOW the crest but still inside the icon area: three subtle horizontal ocean wave lines flowing left to right, evenly spaced, in the same gold tone. BELOW the icon, the brand name 'AURUM COAST' rendered LARGE and DOMINANT in elegant sharp serif typography with clean lines and generous letter spacing, occupying roughly 40 percent of canvas width. Below the brand name a thin horizontal divider line, then the tagline 'TIMELESS LUXURY' in much smaller clean sans-serif with wide letter spacing. All elements in polished metallic gold embossed 3D texture with soft highlights, sophisticated serious luxury aesthetic. Colors: matte charcoal #0B0C10 background, polished gold #D4AF37. --ar 16:9. Avoid: tower, vase, funnel, pyramid, incomplete circle, broken ring, small text, generic typography, missing waves, blurry waves.",
    aspect_ratio: '16:9',
  },
];

/**
 * Carga .env.local si existe (parseo minimo, sin dotenv -> 0 deps).
 * No pisa variables ya presentes en process.env.
 */
async function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // .env.local no existe -> seguimos con variables del entorno
  }
}

/**
 * Llama a la API de generacion de imagenes.
 * @param {{prompt: string, aspect_ratio: string, n?: number}} opts
 * @returns {Promise<string[]>} URLs de las imagenes generadas.
 */
async function generateImage({ prompt, aspect_ratio, n = 3 }) {
  // n=3: genera 3 variantes para comparar y elegir la mejor
  const token = process.env.IMAGE_API_TOKEN;
  if (!token) {
    throw new Error(
      'Falta IMAGE_API_TOKEN. Agregalo a .env.local o exportalo antes de correr el script.'
    );
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      aspect_ratio,
      response_format: 'url',
      n,
      prompt_optimizer: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();

  // Soporta varios formatos comunes:
  //   A. { data: [{ url }, ...] }                   -> OpenAI-ish
  //   B. { data: { image_urls: [url1, ...] } }      -> MiniMax / Hailuo
  //   C. { image_urls: [url1, ...] }                -> variante plana
  //   D. { urls: [url1, ...] }                      -> generico
  let urls = [];
  if (Array.isArray(json.data)) {
    urls = json.data.map((d) => d.url).filter(Boolean);
  } else if (json.data && Array.isArray(json.data.image_urls)) {
    urls = json.data.image_urls.filter(Boolean);
  } else if (Array.isArray(json.image_urls)) {
    urls = json.image_urls.filter(Boolean);
  } else if (Array.isArray(json.urls)) {
    urls = json.urls.filter(Boolean);
  }
  if (urls.length === 0) {
    throw new Error('La API respondio OK pero sin URLs: ' + JSON.stringify(json).slice(0, 300));
  }
  return urls;
}

/**
 * Descarga una URL a disco en outPath.
 */
async function downloadTo(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
  return outPath;
}

/**
 * Convierte una imagen a WebP con sharp (si esta disponible).
 * Si sharp no esta instalado, devuelve el path original.
 */
async function maybeConvertToWebp(inputPath) {
  try {
    const sharpMod = await import('sharp').catch(() => null);
    if (!sharpMod) return inputPath;
    const sharp = sharpMod.default ?? sharpMod;
    const outPath = inputPath.replace(/\.[^.]+$/, '.webp');
    await sharp(inputPath).webp({ quality: 88 }).toFile(outPath);
    await fs.unlink(inputPath).catch(() => {});
    return outPath;
  } catch (err) {
    console.warn(`   (sharp no disponible, dejo ${path.basename(inputPath)} como esta)`);
    return inputPath;
  }
}

async function main() {
  await loadEnvLocal();

  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Output dir: ${path.relative(process.cwd(), OUT_DIR)}\n`);

  let total = 0;
  for (const banner of BANNERS) {
    console.log(`[${banner.slug}] ${banner.label}`);
    console.log(`   prompt: ${banner.prompt.slice(0, 70)}...`);

    let urls;
    try {
      urls = await generateImage(banner);
    } catch (err) {
      console.error(`   ERROR generando: ${err.message}\n`);
      continue;
    }

    console.log(`   API devolvio ${urls.length} URLs. Bajando todas...`);
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = (url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
      const filename =
        urls.length === 1
          ? `${banner.slug}.${ext}`
          : `${banner.slug}-${i + 1}.${ext}`;
      const finalPath = path.join(OUT_DIR, filename);

      try {
        await downloadTo(url, finalPath);
        const converted = await maybeConvertToWebp(finalPath);
        const rel = path.relative(process.cwd(), converted);
        console.log(`   OK  ${rel}`);
        total += 1;
      } catch (err) {
        console.error(`   ERROR descargando ${url}: ${err.message}`);
      }
    }
    console.log('');
  }

  console.log(`Listo. ${total} archivo(s) generado(s) en ${path.relative(process.cwd(), OUT_DIR)}/`);
  console.log('\nProximos pasos:');
  console.log('  1. Revisa los PNG/JPG en public/banners/.');
  console.log('  2. Si quedaron varios por banner, borra los que no uses.');
  console.log('  3. Montalos como <BannerSlide> en MobileFeed.tsx (Fase 2).');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
