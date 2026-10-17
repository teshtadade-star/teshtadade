/**
 * Client-side image upload and compression utility.
 * Optimizes photos from phone cameras and computer storage using HTML5 Canvas,
 * reducing file size from 5-15MB to ~150KB for fast mobile loading and storage.
 */

export interface ProcessedImage {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function processAndCompressImage(
  file: File,
  maxDimension = 1000,
  quality = 0.82
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('تکایە دڵنیابە لە هەڵبژاردنی فایلی وێنە (JPG, PNG, WebP)'));
      return;
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('شکست هێنا لە خوێندنەوەی وێنەکە'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('شکست هێنا لە بارکردنی فۆرماتی وێنە'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('پشتگیری لە پرۆسەی کۆمپرێس نەکرا'));
          return;
        }

        // Draw image onto canvas with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with chosen quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Approximate size of base64 dataUrl
        const compressedSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          width,
          height
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
