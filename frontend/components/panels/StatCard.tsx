interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Soft glow top-right */}
      <div
        className="absolute top-0 right-0 w-12 h-12 rounded-full pointer-events-none"
        style={{ background: 'rgba(212,130,10,0.12)', filter: 'blur(20px)' }}
      />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-1">{label}</p>
          <p className="text-2xl font-bold text-white font-headline">{value}</p>
          {subtext && (
            <p className="text-[10px] text-white/30 mt-1">{subtext}</p>
          )}
        </div>
        {icon && (
          <div className="text-primary/50">{icon}</div>
        )}
      </div>
    </div>
  );
}
