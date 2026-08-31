const MAX_PRODUCT_IMAGE_BYTES = 500 * 1024;
const MAX_PRODUCT_IMAGE_DIMENSION = 1600;
const SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PreparedProductImage = {
  file: File;
  previewUrl: string;
  byteSize: number;
  width: number;
  height: number;
};

type DecodedImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  dispose(): void;
};

/** Resize and encode before upload; server-side validation still remains mandatory. */
export async function prepareProductImageForUpload(file: File): Promise<PreparedProductImage> {
  if (!SOURCE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP product image.");
  }
  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) throw new Error("The selected image has invalid dimensions.");
    const baseScale = Math.min(1, MAX_PRODUCT_IMAGE_DIMENSION / Math.max(decoded.width, decoded.height));
    const scales = [1, 0.86, 0.72, 0.6, 0.5];
    const qualities = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44];
    for (const scale of scales) {
      const width = Math.max(1, Math.round(decoded.width * baseScale * scale));
      const height = Math.max(1, Math.round(decoded.height * baseScale * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Your browser could not prepare this image safely.");
      context.drawImage(decoded.source, 0, 0, width, height);
      for (const quality of qualities) {
        const blob = await canvasToWebp(canvas, quality);
        if (blob && blob.size > 0 && blob.size <= MAX_PRODUCT_IMAGE_BYTES) {
          const stem = safeFilenameStem(file.name);
          const output = new File([blob], `${stem}.webp`, { type: "image/webp", lastModified: Date.now() });
          return {
            file: output,
            previewUrl: URL.createObjectURL(output),
            byteSize: output.size,
            width,
            height,
          };
        }
      }
    }
  } finally {
    decoded.dispose();
  }
  throw new Error("This image could not be reduced to 500 KB safely. Please choose a simpler or smaller image.");
}

export function releasePreparedProductImage(image: PreparedProductImage | null) {
  if (image) URL.revokeObjectURL(image.previewUrl);
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The selected image could not be decoded."));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function safeFilenameStem(name: string) {
  const raw = String(name ?? "product-image").replace(/\.[^.]+$/u, "");
  const normalized = raw.replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 80);
  return normalized || "product-image";
}
