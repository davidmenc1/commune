import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, GitHubClient } from "@/lib/github";

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

  try {
    const tokenExchange = await exchangeCodeForToken(code);

    // Verify the token works by fetching user
    const client = new GitHubClient(tokenExchange.accessToken);
    await client.getUser();

    const callbackUrl = new URL(
      `/chat/channels/${channelId}`,
      request.url
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
      new URL(
        `/chat/channels/${channelId}?github_error=token_exchange_failed`,
        request.url
      )
    );
  }
}
