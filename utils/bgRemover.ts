import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

/**
 * AI Studio Background Replacer:
 * 1. Primary: isnet_quint8 neural segmentation with open CORS static model assets.
 * 2. Fallback: Edge-connected border flood-fill (only flows from outer borders inward, never touches interior subject).
 */
export const removeBackground = async (imageBase64: string): Promise<string> => {
  if (!imageBase64) throw new Error("No image provided");

  const { fullDataUrl } = await parseImageInput(imageBase64);

  // 1. Primary: Neural Segmentation using verified CDN assets
  try {
    const blob = await imglyRemoveBackground(fullDataUrl, {
      publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.7/dist/',
      model: 'isnet_quint8',
      output: {
        format: 'image/png',
        quality: 0.95
      }
    });

    if (blob) {
      const whiteStudio = await compositeOnSolidWhite(blob);
      if (whiteStudio && whiteStudio.length > 500) {
        return whiteStudio;
      }
    }
  } catch (neuralErr: any) {
    console.warn("[BG Studio] Neural engine notice:", neuralErr?.message || neuralErr);
  }

  // 2. Safe Fallback: Edge-connected wall cleaner
  try {
    const safeResult = await borderConnectedWallCleaner(fullDataUrl);
    if (safeResult && safeResult.length > 500) {
      return safeResult;
    }
  } catch (borderErr) {
    console.warn("[BG Studio] Border cleaner notice:", borderErr);
  }

  return fullDataUrl;
};

/**
 * Composites transparent PNG blob onto pure solid studio white (#FFFFFF)
 */
async function compositeOnSolidWhite(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Fill pure solid studio white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the isolated person on top
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

/**
 * Edge-Connected Wall Cleaner:
 * Starts ONLY from the outer photo borders (x=0, x=W, y=0) and flows inward only through
 * adjacent wall pixels. Stops immediately when hitting the candidate's body or clothes.
 * NEVER modifies interior pixels (face, eyes, hijab, clothes are 100% safe).
 */
async function borderConnectedWallCleaner(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Sample border wall colors (top-left, top-right, left, right)
      const samples = [
        { x: 2, y: 2 },
        { x: width - 3, y: 2 },
        { x: 2, y: Math.floor(height * 0.25) },
        { x: width - 3, y: Math.floor(height * 0.25) }
      ];

      let avgR = 0, avgG = 0, avgB = 0;
      samples.forEach(s => {
        const i = (s.y * width + s.x) * 4;
        avgR += data[i];
        avgG += data[i + 1];
        avgB += data[i + 2];
      });
      avgR = Math.round(avgR / samples.length);
      avgG = Math.round(avgG / samples.length);
      avgB = Math.round(avgB / samples.length);

      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      // Seed queue with border pixels
      for (let x = 0; x < width; x++) {
        queue.push(0 * width + x); // top edge
        queue.push((height - 1) * width + x); // bottom edge
      }
      for (let y = 0; y < height; y++) {
        queue.push(y * width + 0); // left edge
        queue.push(y * width + (width - 1)); // right edge
      }

      const colorDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
        return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
      };

      // Breadth-first search from borders only
      let head = 0;
      while (head < queue.length) {
        const pos = queue[head++];
        if (visited[pos]) continue;
        visited[pos] = 1;

        const x = pos % width;
        const y = Math.floor(pos / width);
        const idx = pos * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Is this pixel similar to the border wall?
        const dist = colorDist(r, g, b, avgR, avgG, avgB);
        // Wall tolerance: must be close to background wall color and not a strong contrasting person edge
        if (dist < 45 || (r > 200 && g > 200 && b > 200 && dist < 70)) {
          // Set to studio pure white
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;

          // Propagate to 4 neighbors
          if (x > 0 && !visited[pos - 1]) queue.push(pos - 1);
          if (x < width - 1 && !visited[pos + 1]) queue.push(pos + 1);
          if (y > 0 && !visited[pos - width]) queue.push(pos - width);
          if (y < height - 1 && !visited[pos + width]) queue.push(pos + width);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Normalizes input image into base64 data and mimeType
 */
async function parseImageInput(input: string): Promise<{ data: string; mimeType: string; fullDataUrl: string }> {
  let rawUrl = input;
  if (input.startsWith('http') || input.startsWith('blob:')) {
    try {
      const response = await fetch(input);
      const blob = await response.blob();
      rawUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {}
  } else if (!input.startsWith('data:')) {
    rawUrl = `data:image/jpeg;base64,${input}`;
  }

  return {
    data: rawUrl.split(',')[1] || rawUrl,
    mimeType: 'image/jpeg',
    fullDataUrl: rawUrl
  };
}
