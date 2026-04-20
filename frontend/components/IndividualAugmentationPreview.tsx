'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw } from 'lucide-react';

interface IndividualAugmentationPreviewProps {
  augmentationKey: string;
  augmentationLabel: string;
  projectId: string | undefined;
  imageSize: number;
}

export function IndividualAugmentationPreview({
  augmentationKey,
  augmentationLabel,
  projectId,
  imageSize,
}: IndividualAugmentationPreviewProps) {
  const [preview, setPreview] = useState<{ original: string; augmented: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const generatePreview = useCallback(async () => {
    if (!projectId) {
      setError('No project selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsExpanded(true);

    try {
      const token = localStorage.getItem('access_token');
      
      // Create augmentation config with only this specific augmentation enabled
      const singleAugmentation = { [augmentationKey]: true };
      
      const response = await fetch(`/api/projects/${projectId}/train/augmentation-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          augmentations: singleAugmentation,
          image_size: imageSize,
          single_augmentation: true, // Flag to indicate we want preview for just this one
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate preview');
      }

      const data = await response.json();
      if (data.previews && data.previews.length > 0) {
        setPreview({
          original: data.previews[0].original,
          augmented: data.previews[0].augmented,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, imageSize, augmentationKey]);

  return (
    <div className="mt-2">
      {/* Preview Button */}
      <Button
        onClick={generatePreview}
        disabled={isLoading || !projectId}
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3 h-3 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Eye className="w-3 h-3" />
            Preview
          </>
        )}
      </Button>

      {/* Expanded Preview Area */}
      {isExpanded && (
        <div className="mt-2 p-2 bg-muted/30 rounded-md border border-border/50">
          {error ? (
            <div className="text-xs text-red-500">{error}</div>
          ) : preview ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase">Original</div>
                <div className="relative aspect-square bg-muted rounded overflow-hidden">
                  <img
                    src={preview.original}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-medium text-primary">
                  {augmentationLabel}
                </div>
                <div className="relative aspect-square bg-muted rounded overflow-hidden ring-1 ring-primary/20">
                  <img
                    src={preview.augmented}
                    alt={augmentationLabel}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
              {isLoading ? 'Generating preview...' : 'Click Preview to see effect'}
            </div>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="mt-2 text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Hide preview
          </button>
        </div>
      )}
    </div>
  );
}
