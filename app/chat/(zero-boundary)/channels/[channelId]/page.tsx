import { ClientChannelMessages } from "./client";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  return (
    <div>
      <ClientChannelMessages channelId={channelId} />
    </div>
  );
}

