/**
 * This file implements a *magic* catch-all route that renders the CredBuild editor.
 *
 * This route exposes /credbuild/[...credbuildPath], but is disabled by middleware.ts. The middleware
 * then rewrites all URL requests ending in `/edit` to this route, allowing you to visit any
 * page in your application and add /edit to the end to spin up a CredBuild editor.
 *
 * This approach enables public pages to be statically rendered whilst the /credbuild route can
 * remain dynamic.
 *
 * NB this route is public, and you will need to add authentication
 */

// import React from "react";
import "@crediblemark/build/credbuild.css";
import { CredbuildClient } from "@/modules/page/ui/credbuild/CredbuildClient";
import { Metadata } from "next";
import { getPage } from "@/modules/page/ui/content-display";
import type { Data } from "@crediblemark/build";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSiteId, getTenant } from "@/lib/domains/tenant";
import { headers } from "next/headers";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ credbuildPath: string[] }>;
}): Promise<Metadata> {
  const { credbuildPath = [] } = await params;
  const path = `/${credbuildPath.join("/")}`;

  return {
    title: "CredBuild: " + path,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ credbuildPath: string[] }>;
}) {
  const session = await getServerSession(authOptions);
  const _siteId = await getSiteId();
  const tenant = await getTenant();
  const headersList = await headers();
  const pathname = headersList.get("x-url") || "/credbuild";
  const host = headersList.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

  if (!session) {
    // If we are on a subdomain, redirect to the auth bridge on the root domain
    if (tenant && host !== rootDomain && host !== `www.${rootDomain}`) {
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const targetUrl = `${protocol}://${host}${pathname}`;
      const bridgeUrl = `${protocol}://${rootDomain}/api/auth/bridge?target=${encodeURIComponent(targetUrl)}`;
      return redirect(bridgeUrl);
    }
    
    // Otherwise (root domain), just go to login
    return redirect("/login");
  }

  // Check roles: only "admin", "editor", "owner" are allowed.
  const userRole = (session.user as any).role;
  const allowedRoles = ["admin", "editor", "owner"];
  if (!allowedRoles.includes(userRole)) {
    return redirect("/dashboard");
  }

  const { credbuildPath = [] } = await params;
  const path = `/${credbuildPath.join("/")}`;
  const data = await getPage(path);

  return <CredbuildClient path={path} data={(data?.data as Partial<Data>) || {}} />;
}

export const dynamic = "force-dynamic";
