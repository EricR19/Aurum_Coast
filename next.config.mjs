/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    // Para static export NO se puede usar el Image Optimization server-side.
    // Hay que usar `unoptimized: true` y dejar que el navegador sirva
    // las imagenes tal cual (Next las pasa por AVIF/WebP via `formats`
    // solo en runtime; en build el cliente hace la eleccion).
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Si Render lo sirve bajo un subpath (ej. https://site.onrender.com/aurum),
  // descomentar la siguiente linea con el prefijo correspondiente:
  // basePath: '/aurum',
};

export default nextConfig;
