async function loadBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older Safari: fall back to an <img>, which applies EXIF orientation itself.
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      }
      img.src = url
    })
  }
}

function drawScaled(src, maxDim, quality) {
  const w = src.width || src.naturalWidth
  const h = src.height || src.naturalHeight
  const scale = Math.min(1, maxDim / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Downscale a photo for upload (~1200px) and produce a small thumbnail
 * (~220px) for local storage.
 */
export async function processImage(file) {
  const src = await loadBitmap(file)
  const dataUrl = drawScaled(src, 1200, 0.82)
  const thumb = drawScaled(src, 220, 0.6)
  src.close?.()
  return {
    dataUrl,
    thumb,
    base64: dataUrl.split(',')[1],
    mediaType: 'image/jpeg',
  }
}
