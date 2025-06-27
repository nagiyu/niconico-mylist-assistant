import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/config/authOptions";
import SignInPrompt from "@/app/components/auth/SignInPrompt";
import SignedInContent from "@/app/components/auth/SignedInContent";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getServerSession(authOptions);

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
