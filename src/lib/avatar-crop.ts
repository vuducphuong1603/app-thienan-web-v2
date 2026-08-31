// Toán học cho khung crop avatar (kéo + phóng to trong khung vuông/tròn).
// Mô hình: ảnh vẽ ở giữa khung viewport (cạnh V), scale = coverScale * zoom,
// offset là độ dịch tâm ảnh so với tâm khung (px màn hình).

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

/** Scale nhỏ nhất để ảnh phủ kín khung vuông cạnh `viewport` */
export function coverScale(imgW: number, imgH: number, viewport: number): number {
  return viewport / Math.min(imgW, imgH)
}

/** Kẹp offset sao cho ảnh luôn phủ kín khung (không lộ nền) */
export function clampOffset(
  offset: { x: number; y: number },
  imgW: number,
  imgH: number,
  scale: number,
  viewport: number
): { x: number; y: number } {
  const maxX = Math.max(0, (imgW * scale - viewport) / 2)
  const maxY = Math.max(0, (imgH * scale - viewport) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)) + 0,
    y: Math.min(maxY, Math.max(-maxY, offset.y)) + 0,
  }
}

/**
 * Từ zoom/offset trong khung, tính vùng vuông cần cắt trên ảnh gốc
 * (toạ độ pixel ảnh gốc) để vẽ lên canvas xuất file.
 */
export function computeSourceRect(
  imgW: number,
  imgH: number,
  scale: number,
  offset: { x: number; y: number },
  viewport: number
): { sx: number; sy: number; sSize: number } {
  // Toạ độ mép trái/trên của ảnh (đã scale) trong hệ toạ độ khung
  const imgLeft = viewport / 2 - (imgW * scale) / 2 + offset.x
  const imgTop = viewport / 2 - (imgH * scale) / 2 + offset.y
  return {
    sx: -imgLeft / scale + 0,
    sy: -imgTop / scale + 0,
    sSize: viewport / scale,
  }
}
