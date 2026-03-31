import { BoundingBox, DefectClass } from './types';

export function drawBean(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number
) {
  // Create a deterministic pseudo-random bean shape based on seed
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const colors = [
    '#8B6F47',
    '#9D7E54',
    '#A8915F',
    '#6B5D45',
    '#7A6B52',
    '#8B7D65',
  ];
  const color = colors[seed % colors.length];

  ctx.fillStyle = color;
  ctx.beginPath();

  // Draw a bean-like shape
  const points = 8;
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2;
    const r = size * (0.7 + 0.3 * random(i * 123));
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Add shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.ellipse(
    x - size * 0.2,
    y - size * 0.2,
    size * 0.3,
    size * 0.2,
    -Math.PI / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

export function fillBeanCanvas(
  canvas: HTMLCanvasElement,
  seed: number,
  defectCount: number = 0,
  defectClasses: DefectClass[] = [],
  boundingBoxes: BoundingBox[] = []
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.fillStyle = '#F5F1EB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const beanSize = 20;
  const cols = Math.floor(canvas.width / (beanSize * 3));
  const rows = Math.floor(canvas.height / (beanSize * 3));

  // Draw grid of beans
  let beanIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (beanSize * 3) + beanSize * 1.5;
      const y = r * (beanSize * 3) + beanSize * 1.5;
      const beanSeed = seed + beanIndex;
      drawBean(ctx, x, y, beanSize, beanSeed);
      beanIndex++;
    }
  }

  // Draw bounding boxes if provided
  if (boundingBoxes && boundingBoxes.length > 0) {
    boundingBoxes.forEach((box) => {
      const defectClass = defectClasses.find((c) => c.id === box.cls);
      if (defectClass) {
        ctx.strokeStyle = defectClass.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.w, box.h);

        // Draw class label
        ctx.fillStyle = defectClass.color;
        ctx.fillRect(box.x, box.y - 18, 80, 16);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(defectClass.name, box.x + 2, box.y - 5);
      }
    });
  }
}

export function drawDetectionBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  label: string,
  confidence: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Draw label background
  ctx.fillStyle = color;
  const labelText = `${label} ${(confidence * 100).toFixed(0)}%`;
  const textWidth = ctx.measureText(labelText).width;
  ctx.fillRect(x, y - 22, textWidth + 6, 20);

  // Draw label text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(labelText, x + 3, y - 6);
}

export function generateRandomDetections(
  seed: number,
  defectClasses: DefectClass[],
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = 0.5
) {
  const detections = [];
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const numDetections = Math.floor(random(1) * 8) + 3;

  for (let i = 0; i < numDetections; i++) {
    const confidence = random(i * 100 + 50);
    if (confidence >= threshold) {
      const classIdx = Math.floor(random(i * 200) * defectClasses.length);
      const defClass = defectClasses[classIdx];

      detections.push({
        cls: defClass.id,
        x: random(i * 300) * (canvasWidth - 60),
        y: random(i * 400) * (canvasHeight - 60),
        w: random(i * 500) * 40 + 30,
        h: random(i * 600) * 40 + 30,
        conf: confidence,
      });
    }
  }

  return detections;
}
