import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center">
      <div className="text-slate-300 mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-slate-500 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-4">{description}</p>
      <p className="text-sm text-slate-400">{action}</p>
    </div>
  );
}
