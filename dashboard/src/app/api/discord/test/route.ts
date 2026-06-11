import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const botToken = process.env.DISCORD_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json({ error: 'DISCORD_TOKEN or DISCORD_CHANNEL_ID is not configured.' }, { status: 400 });
    }

    const payload = {
      content: "✅ **FinanceBot Connection Test**\nYour Discord integration is fully functional and ready to receive alerts and morning briefings!"
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${botToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Discord webhook error:", text);
      return NextResponse.json({ error: `Discord responded with status ${response.status}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Discord Test Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
