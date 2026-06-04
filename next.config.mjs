/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow large CSV payloads through server actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
