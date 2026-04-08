import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, GitHubClient } from "@/lib/github";
import { getAuthBaseUrl } from "@/app/auth/server-config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appBaseUrl = getAuthBaseUrl();

  if (error) {
    return NextResponse.redirect(
      new URL(`/chat/channels?github_error=${encodeURIComponent(error)}`, appBaseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/chat/channels?github_error=missing_params", appBaseUrl));
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
      new URL("/chat/channels?github_error=invalid_state", appBaseUrl)
    );
  }

  try {
    const tokenExchange = await exchangeCodeForToken(code);

    // Verify the token works by fetching user
    const client = new GitHubClient(tokenExchange.accessToken);
    await client.getUser();

    const callbackUrl = new URL(
      `/chat/channels/${channelId}`,
      appBaseUrl
    );
    callbackUrl.searchParams.set("github_setup", "pending");
    callbackUrl.searchParams.set("github_token", tokenExchange.accessToken);

    if (tokenExchange.refreshToken) {
      callbackUrl.searchParams.set("github_refresh_token", tokenExchange.refreshToken);
    }

    if (tokenExchange.expiresAt) {
      callbackUrl.searchParams.set(
        "github_token_expires_at",
        tokenExchange.expiresAt.toISOString()
      );
    }

    if (tokenExchange.refreshTokenExpiresAt) {
      callbackUrl.searchParams.set(
        "github_refresh_token_expires_at",
        tokenExchange.refreshTokenExpiresAt.toISOString()
      );
    }

    return NextResponse.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    return NextResponse.redirect(
      new URL(`/chat/channels/${channelId}?github_error=token_exchange_failed`, appBaseUrl)
    );
  }
}
