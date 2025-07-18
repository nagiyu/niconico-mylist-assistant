import { IAccessToken } from "@shared/auth/IAccessToken";

declare module "next-auth" {
  interface Session {
    tokens: IAccessToken[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tokens: IAccessToken[];
  }
}

export type { Session } from "next-auth";
export type { JWT } from "next-auth/jwt";
