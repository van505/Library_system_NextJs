import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled to prevent Supabase auth-token lock contention caused by
  // React Strict Mode's double-mount in development
  reactStrictMode: false,
};

export default nextConfig;
