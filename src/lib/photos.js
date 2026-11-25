/** Resize and compress a selected image before upload, keeping photos within backend quotas. */
export async function compressPhoto(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose an image smaller than 15 MB.');
  const bitmap = await createImageBitmap(file);
  try { const canvas = document.createElement('canvas'); let size = Math.min(1600, Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 6; attempt++) { const scale = size / Math.max(bitmap.width, bitmap.height); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.78)); if (blob && blob.size <= 200 * 1024) return blob; size *= 0.75; }
    throw new Error('This image is too large. Please choose a smaller photo.');
  } finally { bitmap.close(); }
}
