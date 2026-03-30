import { DefectClass, Model } from './types';

export const DEFECT_CLASSES: DefectClass[] = [
  { id: 1, name: 'Insect Damage', category: 'Physical', color: '#E53E3E' },
  { id: 2, name: 'Discolored', category: 'Surface', color: '#DD6B20' },
  { id: 3, name: 'Broken', category: 'Physical', color: '#D6BCAA' },
  { id: 4, name: 'Withered', category: 'Physical', color: '#9F7AEA' },
  { id: 5, name: 'Immature', category: 'Development', color: '#667EEA' },
  { id: 6, name: 'Floating', category: 'Position', color: '#48BB78' },
  { id: 7, name: 'Moldy', category: 'Biological', color: '#4FD1C5' },
  { id: 8, name: 'Healthy', category: 'Quality', color: '#F6AD55' },
];

export const MODELS: Model[] = [
  {
    name: 'YOLOv8-nano',
    map50: 0.726,
    map75: 0.412,
    prec: 0.81,
    rec: 0.67,
    f1: 0.73,
    spd: 28.2,
    type: 'baseline',
  },
  {
    name: 'YOLOv8-small',
    map50: 0.814,
    map75: 0.534,
    prec: 0.89,
    rec: 0.76,
    f1: 0.82,
    spd: 16.8,
    type: 'baseline',
  },
  {
    name: 'YOLOv8-medium',
    map50: 0.876,
    map75: 0.612,
    prec: 0.92,
    rec: 0.84,
    f1: 0.88,
    spd: 9.4,
    type: 'proposed',
  },
  {
    name: 'YOLOv8-large',
    map50: 0.912,
    map75: 0.678,
    prec: 0.95,
    rec: 0.89,
    f1: 0.92,
    spd: 5.2,
    type: 'proposed',
  },
];

export const INITIAL_IMAGES = [
  { id: 1, seed: 42, status: 'annotated', count: 8 },
  { id: 2, seed: 43, status: 'annotated', count: 6 },
  { id: 3, seed: 44, status: 'pending', count: 0 },
  { id: 4, seed: 45, status: 'pending', count: 0 },
  { id: 5, seed: 46, status: 'annotated', count: 5 },
];

export const ACTIVITY_LOGS = [
  {
    id: 1,
    timestamp: '2024-03-19 10:30',
    action: 'Image Uploaded',
    details: 'Bean_Harvest_2024_001.jpg',
  },
  {
    id: 2,
    timestamp: '2024-03-19 10:25',
    action: 'Model Training',
    details: 'YOLOv8-medium completed',
  },
  {
    id: 3,
    timestamp: '2024-03-19 09:45',
    action: 'Annotation Complete',
    details: '8 defects annotated',
  },
];

export const CLASS_DISTRIBUTION = [
  { name: 'Insect Damage', value: 24 },
  { name: 'Discolored', value: 31 },
  { name: 'Broken', value: 18 },
  { name: 'Withered', value: 15 },
  { name: 'Immature', value: 22 },
  { name: 'Floating', value: 12 },
  { name: 'Moldy', value: 8 },
  { name: 'Healthy', value: 10 },
];
