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
  id: number;
  seed: number;
  status: 'pending' | 'annotated' | 'training' | 'complete';
  count: number;
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
