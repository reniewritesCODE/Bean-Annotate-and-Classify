'use client';

import { Panel } from '@/components/panels';
import { MODELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { Download, Eye } from 'lucide-react';
import { useState } from 'react';

export function RegistryView() {
  const { addToast } = useApp();
  const [sortBy, setSortBy] = useState('map50');

  const sortedModels = [...MODELS].sort((a, b) => {
    switch (sortBy) {
      case 'map50':
        return b.map50 - a.map50;
      case 'map75':
        return b.map75 - a.map75;
      case 'spd':
        return a.spd - b.spd;
      default:
        return 0;
    }
  });

  const handleDownload = (modelName: string) => {
    addToast(`${modelName} downloaded`, 'success');
  };

  const handleDeploy = (modelName: string) => {
    addToast(`${modelName} deployed to production`, 'success');
  };

  return (
    <div className="p-8 space-y-8">
      {/* Sorting */}
      <Panel title="Model Registry">
        <div className="mb-6 flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-input text-foreground"
          >
            <option value="map50">Sort by mAP@50 (desc)</option>
            <option value="map75">Sort by mAP@75 (desc)</option>
            <option value="spd">Sort by Speed (asc)</option>
          </select>
        </div>

        {/* Models Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Model
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  mAP@50
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  mAP@75
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Precision
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Recall
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  F1 Score
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Speed (ms)
                </th>
                <th className="text-center py-3 px-4 font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model) => (
                <tr
                  key={model.name}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    model.type === 'proposed' ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-foreground">
                        {model.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {model.type}
                      </p>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4 font-bold text-primary">
                    {model.map50.toFixed(3)}
                  </td>
                  <td className="text-center py-3 px-4">
                    {model.map75.toFixed(3)}
                  </td>
                  <td className="text-center py-3 px-4">
                    {model.prec.toFixed(3)}
                  </td>
                  <td className="text-center py-3 px-4">{model.rec.toFixed(3)}</td>
                  <td className="text-center py-3 px-4 font-semibold">
                    {model.f1.toFixed(3)}
                  </td>
                  <td className="text-center py-3 px-4">{model.spd.toFixed(1)}</td>
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDownload(model.name)}
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-primary" />
                      </button>
                      <button
                        onClick={() => handleDeploy(model.name)}
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Deploy"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Stats */}
      <Panel title="Registry Statistics">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{MODELS.length}</p>
            <p className="text-muted-foreground">Total Models</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {(
                MODELS.reduce((sum, m) => sum + m.map50, 0) / MODELS.length
              ).toFixed(3)}
            </p>
            <p className="text-muted-foreground">Avg mAP@50</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {(
                MODELS.reduce((sum, m) => sum + m.spd, 0) / MODELS.length
              ).toFixed(1)}
              ms
            </p>
            <p className="text-muted-foreground">Avg Speed</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
