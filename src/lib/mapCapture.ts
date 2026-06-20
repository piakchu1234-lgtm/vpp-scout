/**
 * Mapbox WebGL Canvas Capture Utility
 *
 * Safely captures the Mapbox GL canvas including 3D fill-extrusion layers.
 * Handles timing issues, CORS, and rendering state bugs.
 */

import type mapboxgl from 'mapbox-gl';

export interface CaptureOptions {
  /** Image format (default: 'png') */
  format?: 'png' | 'jpeg';

  /** Image quality 0-1 (default: 1.0 for max quality) */
  quality?: number;

  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Number of retry attempts (default: 3) */
  retries?: number;

  /** Delay after idle event in ms (default: 500) */
  idleDelay?: number;
}

export interface CaptureResult {
  success: boolean;
  dataURL?: string;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Capture Mapbox canvas as base64 data URL
 *
 * SAFETY MECHANISMS:
 * 1. Waits for map.idle() event (all layers rendered)
 * 2. Additional delay after idle for 3D layers
 * 3. Validates canvas data is not empty
 * 4. Retry mechanism with exponential backoff
 * 5. Timeout protection
 */
export async function captureMapboxCanvas(
  map: mapboxgl.Map,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const {
    format = 'png',
    quality = 1.0,
    timeout = 10000,
    retries = 3,
    idleDelay = 500,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dataURL = await captureWithTimeout(map, format, quality, timeout, idleDelay);

      // Validate capture
      if (!dataURL || dataURL.length < 100) {
        throw new Error('Canvas capture returned empty or invalid data');
      }

      // Get canvas dimensions
      const canvas = map.getCanvas();
      const width = canvas.width;
      const height = canvas.height;

      console.log(`[mapCapture] ✅ Success on attempt ${attempt}/${retries}`);

      return {
        success: true,
        dataURL,
        width,
        height,
      };
    } catch (error) {
      console.warn(`[mapCapture] ⚠️ Attempt ${attempt}/${retries} failed:`, error);

      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const backoff = 500 * Math.pow(2, attempt - 1);
        console.log(`[mapCapture] Retrying in ${backoff}ms...`);
        await delay(backoff);
      } else {
        // All retries exhausted
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  }

  return {
    success: false,
    error: 'All retry attempts exhausted',
  };
}

/**
 * Internal capture with timeout
 */
async function captureWithTimeout(
  map: mapboxgl.Map,
  format: 'png' | 'jpeg',
  quality: number,
  timeout: number,
  idleDelay: number
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Capture timeout after ${timeout}ms`));
    }, timeout);

    const performCapture = async () => {
      try {
        // Wait for idle state
        await waitForIdle(map);

        // Additional delay for 3D layers to paint
        await delay(idleDelay);

        // Capture canvas
        const canvas = map.getCanvas();
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataURL = canvas.toDataURL(mimeType, quality);

        clearTimeout(timeoutId);
        resolve(dataURL);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    };

    performCapture();
  });
}

/**
 * Wait for map to reach idle state
 */
function waitForIdle(map: mapboxgl.Map): Promise<void> {
  return new Promise((resolve) => {
    if (map.loaded() && !map.isMoving() && !map.isRotating() && !map.isZooming()) {
      // Already idle
      resolve();
    } else {
      // Wait for idle event
      map.once('idle', () => resolve());
    }
  });
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fallback: Capture using html2canvas
 *
 * Use this if native Mapbox capture fails due to CORS or other issues.
 */
export async function captureMapContainerFallback(
  containerElement: HTMLElement
): Promise<CaptureResult> {
  try {
    // Dynamically import html2canvas (only load if needed)
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(containerElement, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#241F21', // SimplySite dark background
      scale: 2, // Higher resolution
    });

    const dataURL = canvas.toDataURL('image/png', 1.0);

    return {
      success: true,
      dataURL,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'html2canvas failed',
    };
  }
}

/**
 * High-level capture with automatic fallback
 */
export async function captureMapWithFallback(
  map: mapboxgl.Map,
  containerElement: HTMLElement,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  console.log('[mapCapture] Attempting native Mapbox capture...');

  // Try native Mapbox capture first
  const nativeResult = await captureMapboxCanvas(map, options);

  if (nativeResult.success) {
    return nativeResult;
  }

  console.warn('[mapCapture] Native capture failed, trying html2canvas fallback...');

  // Fallback to html2canvas
  const fallbackResult = await captureMapContainerFallback(containerElement);

  if (fallbackResult.success) {
    console.log('[mapCapture] ✅ Fallback successful');
    return fallbackResult;
  }

  console.error('[mapCapture] ❌ Both methods failed');
  return {
    success: false,
    error: `Native: ${nativeResult.error}, Fallback: ${fallbackResult.error}`,
  };
}

/**
 * Convert base64 data URL to Blob (for upload)
 */
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const base64 = parts[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Compress base64 image if too large
 *
 * Useful for database storage (some DBs have TEXT limits)
 */
export async function compressBase64Image(
  dataURL: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);

      resolve(compressed);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataURL;
  });
}
