import { UserRole, UserStatus, PlanTier } from "@prisma/client";
import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: UserRole;
    roles?: UserRole[];
    status?: UserStatus;
    plan?: PlanTier;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      roles: UserRole[];
      status: UserStatus;
      plan: PlanTier;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      stripePriceId: string | null;
      stripeCurrentPeriodEnd: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: UserRole;
    roles?: UserRole[];
    status?: UserStatus;
    plan?: PlanTier;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
  }
}
