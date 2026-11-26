/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Las imágenes se comprimen en el navegador; esto es solo un margen
    serverActions: { bodySizeLimit: "5mb" },
  },
};
export default nextConfig;
