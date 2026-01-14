interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({
  heading,
  text,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-0.5 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl truncate">
            {heading}
          </h1>
          {text && (
            <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base truncate">
              {text}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
