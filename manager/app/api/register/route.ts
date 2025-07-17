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

// Lambda を warmup する関数
async function warmupLambda(): Promise<boolean> {
    try {
        const response = await fetch(LAMBDA_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ health_check: true }),
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(30000), // 30 seconds timeout
        });
        
        if (!response.ok) {
            console.error("Lambda warmup failed with status:", response.status);
            return false;
        }
        
        // Parse response to ensure Lambda is actually ready
        const data = await response.json();
        console.log("Lambda warmup successful:", data);
        return true;
    } catch (error) {
        console.error("Lambda warmup failed:", error);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { email, password, id_list, subscription, title }: IRegisterRequest = await req.json();

        // パスワード暗号化
        const encrypted_password = encryptPassword(password, SHARED_SECRET_KEY);

        // まずLambdaをwarmupする - これが失敗したら処理を停止
        const warmupSuccess = await warmupLambda();
        if (!warmupSuccess) {
            console.error("Lambda warmup failed, cannot proceed with registration");
            return NextResponse.json({ 
                error: "サーバーの準備ができていません。しばらく待ってからもう一度お試しください。" 
            }, { status: 503 });
        }

        // Warmup成功後、少し待つ
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 1. まず delete_and_create アクションを送信
        const deleteResponse = await fetch(LAMBDA_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "delete_and_create",
                email,
                password: encrypted_password,
                id_list,
                subscription: subscription ? JSON.stringify(subscription) : null,
                title: title || "",
            }),
        });

        if (!deleteResponse.ok) {
            console.error("Delete and create action failed", await deleteResponse.text());
            return NextResponse.json({ error: "削除処理に失敗しました。" }, { status: 500 });
        }

        // 2. id_list を3等分
        const chunkSize = Math.ceil(id_list.length / 3);
        const chunks = [];
        for (let i = 0; i < 3; i++) {
            chunks.push(id_list.slice(i * chunkSize, (i + 1) * chunkSize));
        }

        // 3. 3つのリクエストを並列で fire-and-forget
        // 識別子を生成
        const uuid = crypto.randomUUID();

        chunks.forEach((chunk, index) => {
            fetch(LAMBDA_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "register",
                    email,
                    password: encrypted_password,
                    id_list: chunk,
                    subscription: subscription ? JSON.stringify(subscription) : null,
                    title: title || "",
                    uuid: uuid, // 識別子を付与
                    chunk_index: index, // チャンクのインデックスを付与
                }),
            }).catch((error) => {
                console.error("Register action failed:", error);
            });
        });

        // 即座にレスポンスを返す（処理は非同期で続行）
        return NextResponse.json({ message: "登録処理を開始しました。完了時に通知をお送りします。" }, { status: 202 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
