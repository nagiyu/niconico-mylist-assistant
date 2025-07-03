import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  try {
    // Ensure the request method is POST
    if (req.method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    let body;
    try {
      body = await req.json();
    } catch (err: any) {
      if (err.message.includes("Body has already been read")) {
        return NextResponse.json({ error: "Request body has already been read" }, { status: 400 });
      }
      throw err;
    }

    const { message, subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: "No subscription provided" }, { status: 400 });
    }

    // VAPID keys should be set in environment variables
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    
    // Ensure VAPID_SUBJECT is properly formatted with mailto: prefix
    const envSubject = process.env.VAPID_SUBJECT || "admin@example.com";
    const VAPID_SUBJECT = envSubject.startsWith("mailto:") ? envSubject : `mailto:${envSubject}`;

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
