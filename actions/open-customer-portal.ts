"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/session";

export async function openCustomerPortal(userStripeId: string) {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    throw new Error("Unauthorized");
  }

  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: userStripeId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  });

  redirect(session.url);
}
