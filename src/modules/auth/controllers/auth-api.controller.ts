import { NextRequest, NextResponse } from "next/server";
import { getApiContext, apiError } from "@/lib/api/utils";
import crypto from "crypto";
import { IdentityClient } from "../index";
import { encode } from "next-auth/jwt";

/**
 * Handler GET untuk bridge session token.
 */
export async function getBridgeSessionApi(req: NextRequest) {
    const { session, error: authError } = await getApiContext(undefined, { requireSite: false });

    if (authError || !session?.user?.id) {
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = req.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
        return NextResponse.redirect(new URL("/login", `${protocol}://${host}`));
    }

    const target = req.nextUrl.searchParams.get("target");
    if (!target) {
        return apiError("Missing target parameter", 400);
    }

    let targetUrl: URL;
    try {
        targetUrl = new URL(target);
    } catch {
        return apiError("Invalid target URL", 400);
    }

    const secret = process.env.NEXTAUTH_SECRET!;
    const payload = JSON.stringify({
        userId: session.user.id,
        exp: Date.now() + 5 * 60 * 1000,
    });

    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const bridgeToken = Buffer.from(payload).toString("base64url") + "." + signature;

    const acceptUrl = new URL("/api/auth/bridge/accept", targetUrl.origin);
    acceptUrl.searchParams.set("token", bridgeToken);
    acceptUrl.searchParams.set("redirect", targetUrl.pathname + targetUrl.search);

    return NextResponse.redirect(acceptUrl.toString());
}

/**
 * Handler GET untuk menerima bridge session token dan mengeset cookies session.
 */
export async function acceptBridgeSessionApi(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    const redirect = req.nextUrl.searchParams.get("redirect") || "/dashboard";

    const host = req.headers.get("host") || req.nextUrl.host;
    const protocol = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
    const loginRedirectUrl = new URL("/login", `${protocol}://${host}`);

    if (!token) {
        console.error("[BRIDGE] No token provided");
        return NextResponse.redirect(loginRedirectUrl);
    }

    try {
        const secret = process.env.NEXTAUTH_SECRET!;

        // Verify the bridge token and look up user via service
        const user = await IdentityClient.verifyBridgeToken(token);

        // Create a NextAuth-compatible JWT session token
        const sessionToken = await encode({
            token: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                sub: user.id,
            },
            secret,
        });

        // Build redirect URL using the ORIGINAL request hostname
        const redirectUrl = `${protocol}://${host}${redirect}`;

        // Set the session cookie on this subdomain and redirect
        const response = NextResponse.redirect(redirectUrl);
        
        const isProduction = process.env.NODE_ENV === "production";
        const cookieName = isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token";

        response.cookies.set(cookieName, sessionToken, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: isProduction,
            maxAge: 30 * 24 * 60 * 60, // 30 days
        });

        return response;

    } catch (error: any) {
        console.error("[BRIDGE] Verification failed:", error.message);
        return NextResponse.redirect(loginRedirectUrl);
    }
}
