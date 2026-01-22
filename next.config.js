/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.CAP_BUILD === "1" ? "export" : undefined,
  images: { unoptimized: process.env.CAP_BUILD === "1" }, // export mode
};

module.exports = nextConfig;
