import { UserRole, UserStatus, PlanTier } from "@prisma/client";
import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

export type ExtendedUser = User & {
  role: UserRole;
  roles: UserRole[];
  status: UserStatus;
  plan: PlanTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Date | null;
};

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    roles: UserRole[];
    status: UserStatus;
    plan: PlanTier;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
  }
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}
