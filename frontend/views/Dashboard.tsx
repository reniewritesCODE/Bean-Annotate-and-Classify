'use client';

import { StatCard, Panel } from '@/components/panels';
import { ACTIVITY_LOGS, CLASS_DISTRIBUTION } from '@/lib/constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FileImage, CheckCircle, Database } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="p-6 space-y-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Class Distribution */}
        <Panel title="Defect Class Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={CLASS_DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Activity Log */}
        <Panel title="Recent Activity">
          <div className="space-y-3">
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
