import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, GitLabClient } from "@/lib/gitlab";
import { getAuthBaseUrl } from "@/app/auth/server-config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appBaseUrl = getAuthBaseUrl();

  if (error) {
    return NextResponse.redirect(
      new URL(`/chat/channels?gitlab_error=${encodeURIComponent(error)}`, appBaseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/chat/channels?gitlab_error=missing_params", appBaseUrl));
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
      new URL("/chat/channels?gitlab_error=invalid_state", appBaseUrl)
    );
  }

  try {
    const accessToken = await exchangeCodeForToken(code);

    // Verify the token works by fetching user
    const client = new GitLabClient(accessToken);
    await client.getUser();

    // Redirect to a page that will complete the setup
    const callbackUrl = new URL(
      `/chat/channels/${channelId}`,
      appBaseUrl
    );
    callbackUrl.searchParams.set("gitlab_setup", "pending");
    callbackUrl.searchParams.set("gitlab_token", accessToken);

    return NextResponse.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("GitLab OAuth error:", err);
    return NextResponse.redirect(
      new URL(`/chat/channels/${channelId}?gitlab_error=token_exchange_failed`, appBaseUrl)
    );
  }
}

