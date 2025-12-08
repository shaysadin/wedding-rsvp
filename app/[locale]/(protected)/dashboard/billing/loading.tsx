import { BillingPageContentSkeleton } from "@/components/skeletons";

export default function BillingLoading() {
  return (
    <div className="w-full h-full overflow-auto p-6">
      <BillingPageContentSkeleton />
    </div>
  );
}
