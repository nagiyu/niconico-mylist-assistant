// Next.js API Route: /api/register
import { NextRequest, NextResponse } from "next/server";
import { BatchClient, SubmitJobCommand, SubmitJobCommandInput } from '@aws-sdk/client-batch';
import { IRegisterRequest } from "@/app/interface/IRegisterRequest";

export async function POST(req: NextRequest) {
    const { email, password, id_list, subscription, title }: IRegisterRequest = await req.json();

    const client = new BatchClient({ region: process.env.AWS_REGION });

    const params: SubmitJobCommandInput = {
        jobName: `register-batch-job-${Date.now()}`,
        jobQueue: 'dev-niconico-mylist-assistant-register-batch-queue',
        jobDefinition: 'dev-niconico-mylist-assistant-register-batch-jobdef',
        containerOverrides: {
            environment: [
                { name: 'NICONICO_EMAIL', value: email },
                { name: 'NICONICO_PASSWORD', value: password },
                { name: 'NICONICO_ID_LIST', value: id_list.join(',') },
                { name: 'S3_BUCKET_NAME', value: 'niconico-mylist-assistant-register' },
                { name: 'AWS_REGION', value: process.env.AWS_REGION! },
                { name: 'NOTIFICATION_API_ENDPOINT', value: `${process.env.NEXTAUTH_URL!}/api/send-notification` },
                { name: 'PUSH_SUBSCRIPTION', value: subscription! },
            ],
        },
    };

    try {
        const command = new SubmitJobCommand(params);
        const response = await client.send(command);
        console.log('Batch job submitted successfully:', response);
    } catch (error) {
        console.error('Batch job submission failed:', error);

        if (error instanceof Error) {
            return NextResponse.json({ error: `登録処理の開始に失敗しました: ${error.message}` }, { status: 500 });
        } else {
            return NextResponse.json({ error: '登録処理の開始に失敗しました: 不明なエラー' }, { status: 500 });
        }
    }

    return NextResponse.json({ message: "登録処理を開始しました。完了時に通知をお送りします。" }, { status: 202 });
}
