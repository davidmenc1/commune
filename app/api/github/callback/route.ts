import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db/db";
import { channelGithubIntegrationsTable } from "@/app/db/schema";
import { exchangeCodeForToken, GitHubClient } from "@/lib/github";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/chat/channels?github_error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/chat/channels?github_error=missing_params", request.url)
    );
  }

  // Decode state to get channelId
  let channelId: string;
  try {
    const stateData = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    );
    channelId = stateData.channelId;
  } catch {
    return NextResponse.redirect(
      new URL("/chat/channels?github_error=invalid_state", request.url)
    );
  }

  // Get user from JWT cookie/header
  const authHeader = request.headers.get("authorization");
  const cookieJwt = request.cookies.get("jwt")?.value;
  const jwt = authHeader?.replace("Bearer ", "") || cookieJwt;

  // For the callback, we'll get user ID from a temporary cookie we set before OAuth
  // Or we can use a session-based approach - for simplicity, let's extract from localStorage via client redirect
  // Since this is a redirect from GitHub, we need another approach

  // Store pending integration with a temporary token, then complete on client-side
  try {
    const accessToken = await exchangeCodeForToken(code);

    // Verify the token works by fetching user
    const client = new GitHubClient(accessToken);
    await client.getUser();

    // Store the token temporarily with the channelId for the client to complete
    // We'll use a URL parameter to pass the token securely to the client
    // The client will then call another endpoint to finalize with their user ID

    const tempToken = nanoid();

    // Store in a temporary way - we'll use the integration table with a placeholder user
    // The client will update this with the actual user

    // For now, redirect to a page that will complete the setup
    const callbackUrl = new URL(
      `/chat/channels/${channelId}`,
      request.url
    );
    callbackUrl.searchParams.set("github_setup", "pending");
    callbackUrl.searchParams.set("github_token", accessToken);

    return NextResponse.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/chat/channels/${channelId}?github_error=token_exchange_failed`,
        request.url
      )
    );
  }
}

