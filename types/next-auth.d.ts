import { UserRole, UserStatus, PlanTier } from "@prisma/client";
import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

export type ExtendedUser = User & {
  role: UserRole;
  status: UserStatus;
  plan: PlanTier;
};

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    status: UserStatus;
    plan: PlanTier;
  }
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}
