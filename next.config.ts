import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@assistant-ui/react", "radix-ui", "@base-ui/react"],
  },
  devIndicators: false,
};

export default withBundleAnalyzer(nextConfig);
