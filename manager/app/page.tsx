"use client";

import { useSession } from "next-auth/react";
import SignInPrompt from "@/app/components/auth/SignInPrompt";
import SignedInContent from "@/app/components/auth/SignedInContent";
import styles from "./page.module.css";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className={styles.page}>
      {!session ? (
        <SignInPrompt />
      ) : (
        <SignedInContent session={session} />
      )}
    </div>
  );
}
