'use client';

import { useApp } from '@/context/AppContext';
import { Panel } from '@/components/panels';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { AugmentationPreview } from '@/components/AugmentationPreview';
import { Package, CheckCircle, Layers, Calendar, ArrowRight, X, Trash2, Edit2, Eye, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndividualAugmentationPreview } from '@/components/IndividualAugmentationPreview';

interface Version {
  id: string;
  name: string;
  train_split: number;
  val_split: number;
  test_split: number;
  image_size: number;
  created_at: string;
  preprocessing?: { autoOrient: boolean };
  augmentations?: AugmentationOptions;
}

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
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, [currentProject?.id]);

  const fetchVersions = async () => {
    if (!currentProject?.id) return;

    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/versions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleViewVersion = (version: Version) => {
    setSelectedVersion(version);
    setEditName(version.name);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDeleteVersion = async () => {
    if (!selectedVersion || !currentProject?.id) return;

    setIsDeleting(true);
    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/versions/${selectedVersion.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        addToast('Version deleted successfully', 'success');
        setIsModalOpen(false);
        fetchVersions();
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to delete version', 'error');
      }
    } catch (error) {
      console.error('Error deleting version:', error);
      addToast('Network error deleting version', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditVersion = async () => {
    if (!selectedVersion || !currentProject?.id || !editName.trim()) return;

    const token = localStorage.getItem('access_token');

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/versions/${selectedVersion.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        addToast('Version updated successfully', 'success');
        setIsEditing(false);
        setSelectedVersion({ ...selectedVersion, name: editName.trim() });
        fetchVersions();
      } else {
        const data = await res.json();
        addToast(data.detail || 'Failed to update version', 'error');
      }
    } catch (error) {
      console.error('Error updating version:', error);
      addToast('Network error updating version', 'error');
    }
  };

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
      // Refresh versions list
      fetchVersions();
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
              {/* Description */}
              <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/10">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    This augmentation process will artificially increase the size and diversity of your 
                    training dataset by creating modified copies of existing images, which will be fed 
                    for training.
                  </p>
                </div>
              </div>

              {/* Augmentation Items with Previews */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {[
                  { key: 'flip', label: 'Flip', desc: 'Horizontal flip' },
                  { key: 'rotate90', label: '90° Rotate', desc: 'Quarter turn rotation' },
                  { key: 'crop', label: 'Crop', desc: 'Random cropping' },
                  { key: 'rotation', label: 'Rotation', desc: 'Random angle rotation' },
                  { key: 'shear', label: 'Shear', desc: 'Shear transformation' },
                  { key: 'brightness', label: 'Brightness', desc: 'Adjust brightness' },
                  { key: 'exposure', label: 'Exposure', desc: 'Adjust exposure' },
                  { key: 'blur', label: 'Blur', desc: 'Gaussian blur' },
                  { key: 'noise', label: 'Noise', desc: 'Add noise' },
                  { key: 'motionBlur', label: 'Motion Blur', desc: 'Simulate motion' },
                  { key: 'cameraGain', label: 'Camera Gain', desc: 'ISO noise simulation' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="p-3 border border-border/50 rounded-md hover:border-primary/30 transition-colors">
                    <div className="flex items-start gap-3">
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
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`aug-${key}`} className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
                          {label}
                          {config.augmentations[key as keyof AugmentationOptions] && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded">
                              ENABLED
                            </span>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        
                        {/* Individual Preview - only show if enabled or user wants to preview */}
                        <IndividualAugmentationPreview
                          augmentationKey={key}
                          augmentationLabel={label}
                          projectId={currentProject?.id}
                          imageSize={config.imageSize}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Combined Preview - shows all enabled augmentations together */}
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
          {/* Versions List */}
          <Panel title={`Dataset Versions (${versions.length})`} className="font-headline">
            {isLoadingVersions ? (
              <div className="p-4 text-center text-muted-foreground">Loading versions...</div>
            ) : versions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No versions created yet.</p>
                <p className="text-xs mt-1">Configure your dataset and click "Finalize & Create Version"</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {versions.map((version) => (
                  <div 
                    key={version.id} 
                    onClick={() => handleViewVersion(version)}
                    className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{version.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(version.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{version.image_size}px</span>
                          <span>•</span>
                          <span>Split {version.train_split}/{version.val_split}/{version.test_split}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewVersion(version);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Link
                        href={`/projects/${currentProject?.id}/train?version=${version.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          Train
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Version Detail Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-background border border-border rounded-md px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleEditVersion} className="gap-1">
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setIsEditing(false);
                        setEditName(selectedVersion?.name || '');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {selectedVersion?.name}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setIsEditing(true)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </DialogTitle>
              </DialogHeader>

              {selectedVersion && (
                <div className="space-y-6 font-sans text-sm">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <span className="text-muted-foreground text-xs">Created</span>
                      <p className="font-medium">{new Date(selectedVersion.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Image Size</span>
                      <p className="font-medium">{selectedVersion.image_size}px</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Dataset Split</span>
                      <p className="font-medium">
                        Train {selectedVersion.train_split}% / Val {selectedVersion.val_split}% / Test {selectedVersion.test_split}%
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Version ID</span>
                      <p className="font-medium text-xs text-muted-foreground">{selectedVersion.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  {/* Preprocessing */}
                  <div>
                    <h4 className="font-semibold mb-2">Preprocessing</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${selectedVersion.preprocessing?.autoOrient ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        Auto-orient: {selectedVersion.preprocessing?.autoOrient ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>

                  {/* Augmentations */}
                  <div>
                    <h4 className="font-semibold mb-2">Augmentations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVersion.augmentations ? (
                        Object.entries(selectedVersion.augmentations).map(([key, enabled]) => (
                          <span 
                            key={key}
                            className={`px-2 py-1 rounded text-xs ${enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}
                          >
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {enabled ? 'ON' : 'OFF'}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">No augmentation data available</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteVersion}
                      disabled={isDeleting}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeleting ? 'Deleting...' : 'Delete Version'}
                    </Button>
                    <Link href={`/projects/${currentProject?.id}/train?version=${selectedVersion.id}`}>
                      <Button className="gap-2 bg-[#D97706] hover:bg-[#B45309] text-white">
                        Train with this Version
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
