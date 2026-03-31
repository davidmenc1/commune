import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, GitLabClient } from "@/lib/gitlab";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/chat/channels?gitlab_error=${encodeURIComponent(error)}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/chat/channels?gitlab_error=missing_params", request.url)
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
      new URL("/chat/channels?gitlab_error=invalid_state", request.url)
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
      request.url
    );
    callbackUrl.searchParams.set("gitlab_setup", "pending");
    callbackUrl.searchParams.set("gitlab_token", accessToken);

    return NextResponse.redirect(callbackUrl.toString());
  } catch (err) {
    console.error("GitLab OAuth error:", err);
    return NextResponse.redirect(
      new URL(
        `/chat/channels/${channelId}?gitlab_error=token_exchange_failed`,
        request.url
      )
    );
  }
}

