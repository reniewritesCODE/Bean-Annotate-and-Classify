'use client';

import { StatCard, Panel } from '@/components/panels';
import { ACTIVITY_LOGS, CLASS_DISTRIBUTION } from '@/lib/constants';
import { FileImage, CheckCircle, Database } from 'lucide-react';

const CHART_COLORS: Record<string, string> = {
  'Full Black': '#ef4444',
  'Full Sour': '#ea580c',
  'Fungus Damage': '#d97706',
  'Severe Insect Damage': '#be185d',
  'Foreign Matter': '#3A86FF',
  'Dried Cherry/Pod': '#8338EC',
  'Partial Black': '#8b5cf6',
  'Partial Sour': '#3b82f6',
  'Hull/Husk': '#06D6A0',
  'Parchment/Pergamino': '#EF476F',
  'Slight Insect Damage': '#118AB2',
  'Floater': '#F72585',
  'Immature/Unripe': '#10b981',
  'Withered': '#7209B7',
  'Shell': '#4CC9F0',
  'Broken/Chipped/Cut': '#65a30d'
};

export function Dashboard() {
  return (
    <div className="p-4 flex flex-col space-y-4 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Images"
          value={5}
          subtext="2 annotated"
          icon={<FileImage className="w-6 h-6" />}
        />
        <StatCard
          label="Annotations"
          value={19}
          subtext="8 defects avg"
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatCard
          label="Models Trained"
          value={4}
          subtext="1 in registry"
          icon={<Database className="w-6 h-6" />}
        />
        <StatCard
          label="Best mAP@50"
          value={0.912}
          subtext="YOLOv8-large"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <Panel title="Class distribution" className="flex flex-col h-full overflow-hidden">
          <div className="flex flex-col gap-1.5 py-1 pr-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {CLASS_DISTRIBUTION.map((item) => {
              // Calculate percentage based on max value (38)
              const maxVal = Math.max(...CLASS_DISTRIBUTION.map((d) => d.value));
              const widthPct = (item.value / maxVal) * 100;
              const color = CHART_COLORS[item.name] || '#888';

              return (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-36 text-right text-xs text-zinc-300 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <div className="flex-1 h-4 bg-[#262626] rounded-sm relative overflow-hidden">
                    <div
                      className="h-full absolute left-0 top-0 rounded-sm flex items-center justify-end pr-2"
                      style={{ width: `${widthPct}%`, backgroundColor: color }}
                    >
                      <span className="text-[10px] font-semibold text-black/50">
                        {item.value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Activity Log */}
        <Panel title="Recent Activity" className="flex flex-col h-full overflow-hidden">
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-4 custom-scrollbar">
            {ACTIVITY_LOGS.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 pb-3 border-b border-border last:border-b-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {log.action}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.details}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {log.timestamp}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
