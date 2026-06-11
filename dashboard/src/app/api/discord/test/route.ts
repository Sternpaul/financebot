import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'DISCORD_WEBHOOK_URL is not configured.' }, { status: 400 });
    }

    const payload = {
      content: "✅ **FinanceBot Connection Test**\nYour Discord integration is fully functional and ready to receive alerts and morning briefings!"
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
