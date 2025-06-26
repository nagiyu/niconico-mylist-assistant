"use client";

import { signIn } from "next-auth/react";

export default function SignInPrompt() {
    return (
        <div>
            <h1>サインイン</h1>
            <p>サインインしてください。</p>
            <button onClick={() => signIn()}>Login with Google</button>
        </div>
    );
}
