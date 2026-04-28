interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div
      className={`relative rounded-2xl p-4 overflow-hidden ${className}`}
      style={{
        background: 'rgba(20, 20, 20, 0.60)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.07), 0 4px 24px -4px rgba(0,0,0,0.4)',
      }}
    >
      {/* Title accent bar */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-0.5 h-4 rounded-full shrink-0"
          style={{ background: 'linear-gradient(180deg, #ff9159, #D4820A)' }}
        />
        <h3 className="text-sm font-bold tracking-wide text-white/80">{title}</h3>
      </div>
      {children}
    </div>
  );
}
