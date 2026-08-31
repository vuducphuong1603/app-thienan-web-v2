'use client'

// Modal điều chỉnh ảnh đại diện: kéo ảnh trong khung tròn, phóng to bằng
// thanh trượt / lăn chuột / pinch 2 ngón, rồi cắt ra file JPEG vuông 512px.
import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import {
  coverScale,
  clampOffset,
  computeSourceRect,
  MIN_ZOOM,
  MAX_ZOOM,
} from '@/lib/avatar-crop'

const VIEWPORT = 280 // cạnh khung crop (px)
const OUTPUT_SIZE = 512 // cạnh ảnh xuất ra (px)

interface AvatarCropModalProps {
  /** File ảnh gốc người dùng vừa chọn */
  file: File
  /** Nhận file đã cắt + dataURL để hiện preview */
  onConfirm: (file: File, previewUrl: string) => void
  onCancel: () => void
}

export default function AvatarCropModal({ file, onConfirm, onCancel }: AvatarCropModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  // Theo dõi các con trỏ đang nhấn (chuột/ngón tay) để kéo và pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const scale = imageSize ? coverScale(imageSize.w, imageSize.h, VIEWPORT) * zoom : 1

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
      setZoom(z)
      if (imageSize) {
        const s = coverScale(imageSize.w, imageSize.h, VIEWPORT) * z
        setOffset((prev) => clampOffset(prev, imageSize.w, imageSize.h, s, VIEWPORT))
      }
    },
    [imageSize]
  )

  const handleImageLoad = () => {
    const img = imgRef.current
    if (!img) return
    setImageSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchStartRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const prev = pointersRef.current.get(e.pointerId)
    if (!prev || !imageSize) return
    const next = { x: e.clientX, y: e.clientY }
    pointersRef.current.set(e.pointerId, next)

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      // Pinch 2 ngón: đổi zoom theo tỉ lệ khoảng cách 2 ngón
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchStartRef.current.dist > 0) {
        applyZoom((pinchStartRef.current.zoom * dist) / pinchStartRef.current.dist)
      }
      return
    }

    // 1 con trỏ: kéo ảnh
    setOffset((o) =>
      clampOffset(
        { x: o.x + next.x - prev.x, y: o.y + next.y - prev.y },
        imageSize.w,
        imageSize.h,
        scale,
        VIEWPORT
      )
    )
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchStartRef.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))
  }

  // Cắt ảnh theo khung hiện tại và trả file JPEG vuông về cho trang cha
  const handleConfirm = async () => {
    const img = imgRef.current
    if (!img || !imageSize) return
    setIsSaving(true)
    try {
      const { sx, sy, sSize } = computeSourceRect(imageSize.w, imageSize.h, scale, offset, VIEWPORT)
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Không tạo được canvas')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      )
      if (!blob) throw new Error('Không xuất được ảnh')
      const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      onConfirm(croppedFile, canvas.toDataURL('image/jpeg', 0.9))
    } catch (err) {
      console.error('Error cropping avatar:', err)
      alert('Không xử lý được ảnh. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-[360px]">
        <h3 className="text-lg font-bold text-black dark:text-white mb-4 text-center">
          Điều chỉnh ảnh đại diện
        </h3>

        {loadFailed ? (
          // Trình duyệt không hiển thị được định dạng này (vd HEIC trên Chrome)
          <p className="text-sm text-[#666d80] text-center py-8">
            Không xem trước được ảnh này trên trình duyệt. Bạn có thể dùng ảnh gốc hoặc chọn ảnh
            khác (JPG/PNG).
          </p>
        ) : (
          <>
            {/* Khung crop: kéo để di chuyển, khung tròn là vùng sẽ hiển thị */}
            <div
              className="relative mx-auto overflow-hidden rounded-2xl bg-black/80 touch-none cursor-move select-none"
              style={{ width: VIEWPORT, height: VIEWPORT }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Điều chỉnh ảnh"
                  draggable={false}
                  onLoad={handleImageLoad}
                  onError={() => setLoadFailed(true)}
                  className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                  style={
                    imageSize
                      ? {
                          width: imageSize.w * scale,
                          height: imageSize.h * scale,
                          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                        }
                      : { visibility: 'hidden' }
                  }
                />
              )}
              {/* Lớp mờ ngoài vòng tròn */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: '50%',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none" />
            </div>

            {/* Thanh trượt zoom */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => applyZoom(zoom / 1.2)}
                className="p-1.5 rounded-full text-[#666d80] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Thu nhỏ"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[#FA865E]"
                aria-label="Phóng to ảnh"
              />
              <button
                type="button"
                onClick={() => applyZoom(zoom * 1.2)}
                className="p-1.5 rounded-full text-[#666d80] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Phóng to"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-black/40 dark:text-white/40 text-center mt-2">
              Kéo để di chuyển · Lăn chuột hoặc chụm 2 ngón để phóng to
            </p>
          </>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 bg-gray-100 dark:bg-white/10 rounded-full text-sm font-bold text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            Hủy
          </button>
          {loadFailed ? (
            <button
              type="button"
              onClick={() => {
                // Dùng ảnh gốc như trước khi có tính năng crop
                const reader = new FileReader()
                reader.onloadend = () => onConfirm(file, reader.result as string)
                reader.readAsDataURL(file)
              }}
              className="h-10 px-5 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors"
            >
              Dùng ảnh gốc
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!imageSize || isSaving}
              className="h-10 px-5 bg-brand rounded-full text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Đang xử lý...' : 'Xong'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
