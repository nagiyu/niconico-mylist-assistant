import GoogleProvider from "next-auth/providers/google";

import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        if (account.access_token) {
          token.tokens = token.tokens || [];
          token.tokens.push(
            {
              provider: account.provider,
              accessToken: account.access_token
            }
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.tokens = token.tokens || [];
      return session;
    }
  }
}
