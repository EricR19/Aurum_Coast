import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getProductBySlug, products } from '@/lib/products';
import { formatCRC, getPriceCRC } from '@/lib/products';

interface PageProps {
  params: { slug: string };
}

/**
 * Para `output: 'export'` (static site), Next.js necesita saber en build-time
 * que slugs pre-renderizar. Devolvemos todos los productos del catalogo.
 */
export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/**
 * Vista previa pública de un producto. Pensada principalmente para que
 * cuando alguien comparte el link en WhatsApp/iMessage/Twitter, el preview
 * muestre foto + nombre + precio.
 *
 * Tambien funciona como landing real si alguien entra al link directo:
 * muestra una preview minimalista y un CTA hacia el feed completo.
 */
export default async function ProductPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const priceLabel = formatCRC(getPriceCRC(product.priceUSD));
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'AURUM COAST';

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-zinc-50 text-zinc-900">
      <header className="w-full border-b border-zinc-200 bg-white px-6 py-4">
        <Link href="/" className="font-title text-sm font-bold uppercase tracking-[0.3em] text-brand-accent">
          {storeName}
        </Link>
      </header>

      <div className="flex w-full max-w-md flex-col items-center px-6 py-8">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-sm">
          {product.images[0] && (
            <Image
              src={product.images[0].src}
              alt={product.images[0].alt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          )}
        </div>

        <p className="mt-6 font-title text-xs font-semibold uppercase tracking-[0.3em] text-brand-accent">
          {product.brand}
        </p>
        <h1 className="mt-2 text-2xl font-black text-zinc-900">{product.model}</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">{product.shortDescription}</p>

        <p className="mt-6 font-title text-3xl font-bold tabular-nums text-zinc-900">
          {priceLabel}
        </p>

        <Link
          href={`/#${product.slug}`}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-accent py-3.5 text-sm font-bold text-black shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-400 active:scale-[0.98]"
        >
          Ver en el catalogo
        </Link>

        <p className="mt-4 text-[11px] text-zinc-400">
          Vista previa · Compra directo por WhatsApp.
        </p>
      </div>
    </main>
  );
}

/**
 * Genera los meta tags dinamicos por producto.
 *
 * Esto es lo que hace que WhatsApp/iMessage/Twitter/LinkedIn/Discord
 * muestren una preview rica (foto + nombre + precio + descripcion)
 * cuando alguien comparte el link.
 *
 * Como esto es un server component, el HTML se prerenderiza en build,
 * asi que los crawlers de OG (Facebook, Twitter, etc.) pueden scrapearlo
 * sin ejecutar JS.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = getProductBySlug(params.slug);
  if (!product) {
    return { title: 'Producto no encontrado' };
  }

  const priceLabel = formatCRC(getPriceCRC(product.priceUSD));
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'AURUM COAST';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const title = `${product.brand} ${product.model} - ${priceLabel}`;
  const description = `${product.shortDescription} Disponible por ${priceLabel}. Compra directo por WhatsApp con SINPE Movil o contra entrega en Costa Rica.`;
  const canonical = `/product/${product.slug}`;

  // Logo de la marca (sin fondo, con alpha) — branding consistente en
  // todos los previews de WhatsApp/Facebook/Twitter. Como algunos crawlers
  // (WhatsApp especialmente) no soportan alpha en el preview y renderizan
  // el fondo como negro, ponemos un wrapper con fondo negro via CSS en la
  // composicion OG. Por ahora servimos el logo tal cual; si WhatsApp lo
  // muestra mal, agregar una variante con fondo negro explicito.
  const logoUrl = siteUrl
    ? `${siteUrl}/banners/aurum-coast-logo-clean-960.png`
    : '/banners/aurum-coast-logo-clean-960.png';
  const productImage = product.images[0]?.src;
  const productImageUrl =
    productImage && (productImage.startsWith('http') ? productImage : siteUrl ? `${siteUrl}${productImage}` : productImage);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: storeName,
      type: 'website',
      locale: 'es_CR',
      images: [
        // Logo de la marca primero — branding consistente.
        {
          url: logoUrl,
          alt: `${storeName} — Relojes de alta gama`,
          width: 960,
          height: 540,
        },
        // Foto del producto como segunda imagen (algunos crawlers
        // muestran todas; otros solo la primera).
        ...(productImageUrl
          ? [
              {
                url: productImageUrl,
                alt: `${product.brand} ${product.model}`,
                width: 1080,
                height: 1080,
              },
            ]
          : []),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      // Twitter toma solo la primera imagen.
      images: [logoUrl],
    },
  };
}
