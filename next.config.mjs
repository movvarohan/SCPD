/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Node-only mail libraries out of the bundler (they use dynamic requires).
  serverExternalPackages: ["nodemailer", "imapflow"],
  // Allow large CSV payloads through server actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
