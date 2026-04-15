export interface DefectClass {
  id: number;
  name: string;
  category: string;
  color: string;
}

export interface BoundingBox {
  cls: number;
  x: number;
  y: number;
  w: number;
  h: number;
  id?: string;
}

export interface ImageData {
  id: string;
  project_id: string;
  s3_key: string;
  url?: string | null;
  width?: number | null;
  height?: number | null;
  split: 'train' | 'val' | 'test' | string;
  status: 'none' | 'partial' | 'done' | string;
  uploaded_at: string;
}

export interface Model {
  name: string;
  map50: number;
  map75: number;
  prec: number;
  rec: number;
  f1: number;
  spd: number;
  type: 'baseline' | 'proposed';
}

export interface DetectionResult {
  cls: number;
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  acc: number;
  f1: number;
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  action: string;
  details: string;
}

export interface ClassCount {
  class_id: number;
  count: number;
}

export interface ActivityItem {
  timestamp: string;
  action: string;
  details: string;
}

export interface ProjectSummaryResponse {
  project_id: string;
  total_images: number;
  annotated_images: number;
  total_annotations: number;
  class_distribution: ClassCount[];
  recent_activity: ActivityItem[];
}
