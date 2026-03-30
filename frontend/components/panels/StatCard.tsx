interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="text-primary opacity-60">{icon}</div>
        )}
      </div>
    </div>
  );
}
