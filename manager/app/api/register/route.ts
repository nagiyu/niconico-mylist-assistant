// Next.js API Route: /api/register
import { NextRequest, NextResponse } from "next/server";
import { IRegisterRequest } from "@/app/interface/IRegisterRequest";

const LAMBDA_ENDPOINT = process.env.REGISTER_LAMBDA_ENDPOINT!;
const SHARED_SECRET_KEY = process.env.SHARED_SECRET_KEY!;

import crypto from "crypto";

// AES-GCM暗号化（Node.js版）
function encryptPassword(password: string, base64Key: string): string {
    const key = Buffer.from(base64Key, "base64");
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
    const ct = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Python側は nonce + ciphertext + tag をbase64化している
    const encrypted = Buffer.concat([nonce, ct, tag]);
    return encrypted.toString("base64");
}

export async function POST(req: NextRequest) {
    try {
        const { email, password, id_list, subscription }: IRegisterRequest = await req.json();

        // パスワード暗号化
        const encrypted_password = encryptPassword(password, SHARED_SECRET_KEY);

        // Lambda呼び出し（非同期・fire-and-forget）
        fetch(LAMBDA_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password: encrypted_password,
                id_list,
                subscription: subscription ? JSON.stringify(subscription) : null,
            }),
        }).catch((error) => {
            console.error("Lambda invocation failed:", error);
        });

        // 即座にレスポンスを返す（処理は非同期で続行）
        return NextResponse.json({ message: "登録処理を開始しました。完了時に通知をお送りします。" }, { status: 202 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
