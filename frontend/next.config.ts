import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Uploaded artwork is served from /media/ on the storefront origin. In
   * production nginx answers that path off disk and this never fires; in
   * development there is no nginx, so Next stands in for it and forwards to
   * the Django dev server.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const backend = (
      process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"
    ).replace(/\/api\/?$/, "");

    return [{ source: "/media/:path*", destination: `${backend}/media/:path*` }];
  },
};

export default nextConfig;
