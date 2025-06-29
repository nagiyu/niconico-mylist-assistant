import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  try {
    const { message, subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: "No subscription provided" }, { status: 400 });
    }

    // VAPID keys should be set in environment variables
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload = JSON.stringify({
      title: "自動登録完了",
      body: message,
      icon: "/ponzu_square.png",
    });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push notification failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}