'use client';

import { useApp } from '@/context/AppContext';
import { Panel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AugmentationPreview } from '@/components/AugmentationPreview';
import { Package, CheckCircle } from 'lucide-react';

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

interface DatasetConfig {
  imageSize: number;
  preprocessing: {
    autoOrient: boolean;
  };
  augmentations: AugmentationOptions;
  versionName: string;
  trainSplit: number;
  valSplit: number;
  testSplit: number;
}

export function VersionsView() {
  const { addToast, currentProject, images } = useApp();
  const [config, setConfig] = useState<DatasetConfig>({
    imageSize: 640,
    preprocessing: {
      autoOrient: true,
    },
    augmentations: {
      flip: true,
      rotate90: false,
      crop: false,
      rotation: false,
      shear: false,
      brightness: false,
      exposure: false,
      blur: false,
      noise: false,
      motionBlur: false,
      cameraGain: false,
    },
    versionName: '',
    trainSplit: 70,
    valSplit: 20,
    testSplit: 10,
  });

  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  const totalImages = images.length;
  const trainCount = Math.floor(totalImages * (config.trainSplit / 100));
  const valCount = Math.floor(totalImages * (config.valSplit / 100));
  const testCount = totalImages - trainCount - valCount;

  // Handle train split change - adjusts val/test proportionally
  const handleTrainSplitChange = (value: number[]) => {
    const newTrain = Math.min(95, Math.max(50, value[0]));
    const remaining = 100 - newTrain;
    const currentValRatio = config.valSplit / (config.valSplit + config.testSplit);
    const newVal = Math.round(remaining * currentValRatio);
    const newTest = remaining - newVal;
    setConfig({
      ...config,
      trainSplit: newTrain,
      valSplit: newVal,
      testSplit: newTest,
    });
  };

  // Handle val split change - adjusts test accordingly
  const handleValSplitChange = (value: number[]) => {
    const maxVal = 100 - config.trainSplit - 1; // Keep at least 1% for test
    const newVal = Math.min(maxVal, Math.max(1, value[0]));
    const newTest = 100 - config.trainSplit - newVal;
    setConfig({
      ...config,
      valSplit: newVal,
      testSplit: newTest,
    });
  };

  const handleCreateVersion = async () => {
    if (!config.versionName.trim()) {
      addToast('Please enter a version name', 'error');
      return;
    }

    if (totalImages === 0) {
      addToast('No images in project. Please upload images first.', 'error');
      return;
    }

    if (!currentProject?.id) {
      addToast('No project selected', 'error');
      return;
    }

    setIsCreatingVersion(true);

    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: config.versionName,
          train_split: config.trainSplit,
          val_split: config.valSplit,
          test_split: config.testSplit,
          image_size: config.imageSize,
          preprocessing: config.preprocessing,
          augmentations: config.augmentations,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof data.detail === 'string'
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail.map((item: any) => item.msg).join(', ')
            : 'Failed to create version';
        addToast(errorMessage, 'error');
        return;
      }

      addToast('Version created successfully!', 'success');
      // Reset form
      setConfig({
        ...config,
        versionName: '',
      });
    } catch (error) {
      console.error('Error creating version:', error);
      addToast('Network error creating version', 'error');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-4">
        {/* Left Column: Dataset Configuration */}
        <div className="flex flex-col gap-4">
          {/* Version Name */}
          <Panel title="Version Information" className="font-headline">
            <div className="flex flex-col text-sm px-2 font-sans gap-4 py-2">
              <div>
                <label htmlFor="version-name" className="block text-foreground font-medium mb-2">
                  Version Name
                </label>
                <input
                  id="version-name"
                  type="text"
                  value={config.versionName}
                  onChange={(e) => setConfig({ ...config, versionName: e.target.value })}
                  placeholder="e.g., v1.0, v1.1-augmented"
                  disabled={isCreatingVersion}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </Panel>

          {/* Dataset split */}
          <Panel title="Dataset Split" className="font-headline">
            <div className="flex flex-col text-sm px-2 font-sans gap-4 py-2">
              {/* Train Split */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Train</span>
                  <span className="text-foreground">{trainCount} images ({config.trainSplit}%)</span>
                </div>
                <Slider
                  value={[config.trainSplit]}
                  onValueChange={handleTrainSplitChange}
                  min={50}
                  max={95}
                  step={1}
                  disabled={isCreatingVersion}
                  className="w-full"
                />
              </div>

              {/* Validation Split */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Validation</span>
                  <span className="text-foreground">{valCount} images ({config.valSplit}%)</span>
                </div>
                <Slider
                  value={[config.valSplit]}
                  onValueChange={handleValSplitChange}
                  min={1}
                  max={100 - config.trainSplit - 1}
                  step={1}
                  disabled={isCreatingVersion}
                  className="w-full"
                />
              </div>

              {/* Test Split (read-only display) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Test</span>
                  <span className="text-foreground">{testCount} images ({config.testSplit}%)</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/30 rounded-full"
                    style={{ width: `${config.testSplit}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Total images</span>
                  <span>{totalImages}</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Processing */}
          <Panel title="Processing" className="font-headline">
            <div className="flex flex-col text-sm px-2 font-sans">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="font-medium text-foreground">Image size</span>
                <select
                  value={config.imageSize}
                  onChange={(e) => setConfig({ ...config, imageSize: parseInt(e.target.value) })}
                  disabled={isCreatingVersion}
                  className="bg-transparent border border-border rounded-md px-3 py-1.5 min-w-[160px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={320}>320</option>
                  <option value={640}>640</option>
                  <option value={1280}>1280</option>
                </select>
              </div>

              {/* Preprocessing */}
              <div className="py-3">
                <div className="font-medium text-foreground mb-2">Preprocessing</div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auto-orient"
                    checked={config.preprocessing.autoOrient}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        preprocessing: { ...config.preprocessing, autoOrient: checked as boolean },
                      })
                    }
                    disabled={isCreatingVersion}
                  />
                  <label htmlFor="auto-orient" className="text-sm text-foreground cursor-pointer">
                    Auto-orient images (fix EXIF rotation)
                  </label>
                </div>
              </div>
            </div>
          </Panel>

          {/* Augmentations */}
          <Panel title="Augmentations" className="font-headline">
            <div className="flex flex-col text-sm px-2 font-sans py-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'flip', label: 'Flip' },
                  { key: 'rotate90', label: '90° Rotate' },
                  { key: 'crop', label: 'Crop' },
                  { key: 'rotation', label: 'Rotation' },
                  { key: 'shear', label: 'Shear' },
                  { key: 'brightness', label: 'Brightness' },
                  { key: 'exposure', label: 'Exposure' },
                  { key: 'blur', label: 'Blur' },
                  { key: 'noise', label: 'Noise' },
                  { key: 'motionBlur', label: 'Motion Blur' },
                  { key: 'cameraGain', label: 'Camera Gain' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`aug-${key}`}
                      checked={config.augmentations[key as keyof AugmentationOptions]}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          augmentations: { ...config.augmentations, [key]: checked as boolean },
                        })
                      }
                      disabled={isCreatingVersion}
                    />
                    <label htmlFor={`aug-${key}`} className="text-sm text-foreground cursor-pointer">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <AugmentationPreview
            augmentations={config.augmentations}
            imageSize={config.imageSize}
            projectId={currentProject?.id}
          />

          <Button
            className="w-full bg-[#059669] hover:bg-[#047857] text-white py-5 text-[15px] font-semibold flex items-center justify-center gap-2"
            onClick={handleCreateVersion}
            disabled={isCreatingVersion || !config.versionName.trim() || totalImages === 0}
          >
            <CheckCircle className="w-4 h-4" />
            {isCreatingVersion ? 'Creating Version...' : 'Finalize & Create Version'}
          </Button>
        </div>

        {/* Right Column: Information & Next Steps */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="About Versions" className="font-headline">
            <div className="space-y-3 font-sans text-sm text-foreground/80">
              <p>
                A version is a snapshot of your dataset with specific configurations for preprocessing 
                and augmentation. Create versions to prepare your data for training.
              </p>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">What you configure here:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Dataset Split:</strong> Divide images into train, validation, and test sets</li>
                  <li><strong>Processing:</strong> Set image size and preprocessing options</li>
                  <li><strong>Augmentations:</strong> Apply data augmentation techniques to generate variations of your training data</li>
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Next Steps" className="font-headline">
            <div className="space-y-3 font-sans text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">1</div>
                <div>
                  <p className="font-medium text-foreground">Create a Version</p>
                  <p className="text-foreground/60 text-xs">Configure your dataset split, processing, and augmentations above</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">2</div>
                <div>
                  <p className="font-medium text-foreground">Go to Train Model</p>
                  <p className="text-foreground/60 text-xs">Use this version to train your model with specific hyperparameters</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">3</div>
                <div>
                  <p className="font-medium text-foreground">Monitor Training</p>
                  <p className="text-foreground/60 text-xs">Track metrics and validate your model's performance</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Tips" className="font-headline">
            <div className="space-y-2 font-sans text-sm text-foreground/80">
              <p>
                <strong>Dataset Split:</strong> A common split is 70% training, 20% validation, and 10% test. Adjust based on your dataset size.
              </p>
              <p>
                <strong>Image Size:</strong> Smaller sizes (320) train faster but may lose detail. Larger sizes (1280) are slower but more accurate.
              </p>
              <p>
                <strong>Augmentations:</strong> Enable multiple augmentations to improve model robustness and prevent overfitting.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
