interface ClassButtonProps {
  id: number;
  name: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}

export function ClassButton({
  id,
  name,
  color,
  selected,
  onClick,
}: ClassButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">({id})</span>
    </button>
  );
}
