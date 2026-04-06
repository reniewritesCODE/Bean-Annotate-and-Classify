import { DefectClass, Model } from './types';

export const DEFECT_CLASSES: DefectClass[] = [
  { id: 1, name: 'Full Black', category: '1', color: '#ef4444' },
  { id: 2, name: 'Full Sour', category: '1', color: '#ea580c' },
  { id: 3, name: 'Fungus Damage', category: '1', color: '#d97706' },
  { id: 4, name: 'Severe Insect Damage', category: '1', color: '#be185d' },
  { id: 5, name: 'Foreign Matter', category: '1', color: '#3A86FF' },
  { id: 6, name: 'Dried Cherry/Pod', category: '1', color: '#8338EC' },
  { id: 7, name: 'Partial Black', category: '2', color: '#8b5cf6' },
  { id: 8, name: 'Partial Sour', category: '2', color: '#3b82f6' },
  { id: 9, name: 'Hull/Husk', category: '2', color: '#06D6A0' },
  { id: 10, name: 'Parchment/Pergamino', category: '2', color: '#EF476F' },
  { id: 11, name: 'Slight Insect Damage', category: '2', color: '#118AB2' },
  { id: 12, name: 'Floater', category: '2', color: '#F72585' },
  { id: 13, name: 'Immature/Unripe', category: '2', color: '#10b981' },
  { id: 14, name: 'Withered', category: '2', color: '#7209B7' },
  { id: 15, name: 'Shell', category: '2', color: '#4CC9F0' },
  { id: 16, name: 'Broken/Chipped/Cut', category: '2', color: '#65a30d' },
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
  {
    id: 4,
    timestamp: '2024-03-19 09:15',
    action: 'Dataset Exported',
    details: 'YOLO format, 542 images',
  },
  {
    id: 5,
    timestamp: '2024-03-19 08:30',
    action: 'New Model Added',
    details: 'YOLOv8-large registered',
  },
  {
    id: 6,
    timestamp: '2024-03-18 16:45',
    action: 'Annotation Started',
    details: 'Batch 4 (100 images)',
  },
  {
    id: 7,
    timestamp: '2024-03-18 14:20',
    action: 'Images Uploaded',
    details: 'Batch 4: 100 new images',
  },
  {
    id: 8,
    timestamp: '2024-03-18 11:10',
    action: 'Model Evaluation',
    details: 'YOLOv8-small evaluated',
  },
];

export const CLASS_DISTRIBUTION = [
  { name: 'Full Black', value: 38 },
  { name: 'Full Sour', value: 31 },
  { name: 'Fungus Damage', value: 27 },
  { name: 'Severe Insect Damage', value: 24 },
  { name: 'Partial Black', value: 18 },
  { name: 'Partial Sour', value: 16 },
  { name: 'Immature/Unripe', value: 14 },
  { name: 'Broken/Chipped/Cut', value: 12 },
  { name: 'Foreign Matter', value: 8 },
  { name: 'Dried Cherry/Pod', value: 7 },
  { name: 'Hull/Husk', value: 6 },
  { name: 'Parchment/Pergamino', value: 5 },
  { name: 'Slight Insect Damage', value: 4 },
  { name: 'Floater', value: 3 },
  { name: 'Withered', value: 2 },
  { name: 'Shell', value: 1 },
];
