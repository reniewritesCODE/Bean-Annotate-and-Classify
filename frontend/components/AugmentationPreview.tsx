'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/panels';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

interface AugmentationOptions {
  flip: boolean;
  rotate90: boolean;
  crop: boolean;
  rotation: boolean;
  shear: boolean;
  brightness: boolean;
  exposure: boolean;
  blur: boolean;
  noise: boolean;
  motionBlur: boolean;
  cameraGain: boolean;
}

interface AugmentationPreviewProps {
  augmentations: AugmentationOptions;
  imageSize: number;
  projectId: string | undefined;
}

interface PreviewImage {
  image_id: string;
  original: string;
  augmented: string;
}

export function AugmentationPreview({ augmentations, imageSize, projectId }: AugmentationPreviewProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = async () => {
    if (!projectId) {
      setError('No project selected');
      return;
    }

    // Check if any augmentations are enabled
    const anyAugmentationEnabled = Object.values(augmentations).some(Boolean);
    if (!anyAugmentationEnabled) {
      setError('Please enable at least one augmentation to preview');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/projects/${projectId}/train/augmentation-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          augmentations,
          image_size: imageSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate preview');
      }

      const data = await response.json();
      setPreviews(data.previews);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const getEnabledAugmentations = () => {
    return Object.entries(augmentations)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => {
        const labels: Record<string, string> = {
          flip: 'Flip',
          rotate90: '90° Rotate',
          crop: 'Crop',
          rotation: 'Rotation',
          shear: 'Shear',
          brightness: 'Brightness',
          exposure: 'Exposure',
          blur: 'Blur',
          noise: 'Noise',
          motionBlur: 'Motion Blur',
          cameraGain: 'Camera Gain',
        };
        return labels[key] || key;
      });
  };

  const enabledAugmentations = getEnabledAugmentations();

  return (
    <Panel title="Augmentation Preview" className="font-headline">
      <div className="space-y-4">
        {/* Info section */}
        <div className="text-sm text-muted-foreground">
          <p>See how augmentations affect your sample images before training.</p>
          {enabledAugmentations.length > 0 && (
            <div className="mt-2">
              <span className="font-medium">Enabled: </span>
              <span className="text-xs">{enabledAugmentations.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={generatePreview}
          disabled={isLoading || !projectId || enabledAugmentations.length === 0}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Generate Preview
            </>
          )}
        </Button>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Preview images */}
        {previews.length > 0 && (
          <div className="space-y-4">
            {previews.map((preview, index) => (
              <div key={preview.image_id} className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  Sample {index + 1}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Original</div>
                    <div className="relative aspect-square bg-muted rounded-md overflow-hidden">
                      <img
                        src={preview.original}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Augmented</div>
                    <div className="relative aspect-square bg-muted rounded-md overflow-hidden">
                      <img
                        src={preview.augmented}
                        alt="Augmented"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {previews.length === 0 && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Generate Preview" to see augmentation effects</p>
          </div>
        )}
      </div>
    </Panel>
  );
}
