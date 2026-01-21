'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Camera, CameraOff } from 'lucide-react'

interface QRAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onManualAttendance: () => void
  studentName?: string
  studentCode?: string
}

export default function QRAttendanceModal({
  isOpen,
  onClose,
  onManualAttendance,
  studentName,
  studentCode,
}: QRAttendanceModalProps) {
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'error' | 'idle'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
      setCameraStatus('idle')
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    setCameraStatus('loading')
    setErrorMessage('')

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ camera')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraStatus('active')
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setCameraStatus('error')

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Vui lòng cấp quyền truy cập camera')
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('Không tìm thấy camera')
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setErrorMessage('Camera đang được sử dụng bởi ứng dụng khác')
      } else {
        setErrorMessage(error.message || 'Không thể kết nối camera')
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleManualAttendance = () => {
    stopCamera()
    onManualAttendance()
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const retryCamera = () => {
    startCamera()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[20px] w-[400px] p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* QR Scanner Area */}
        <div className="relative w-full aspect-square mb-4 rounded-[16px] overflow-hidden bg-black">
          {/* Video element - always rendered but may be hidden */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
          />

          {/* Loading state */}
          {cameraStatus === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white text-sm">Đang kết nối camera...</p>
            </div>
          )}

          {/* Error state */}
          {cameraStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4">
              <CameraOff className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 text-sm text-center mb-3">{errorMessage}</p>
              <button
                onClick={retryCamera}
                className="px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-orange-500 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Idle state - QR placeholder */}
          {cameraStatus === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
              <Camera className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">Khởi động camera...</p>
            </div>
          )}

          {/* Corner frames overlay - always visible */}
          <div className="absolute inset-0 pointer-events-none p-4">
            {/* Scanning frame */}
            <div className="relative w-full h-full">
              {/* Top-left corner */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-brand rounded-tl-xl" />
              {/* Top-right corner */}
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-brand rounded-tr-xl" />
              {/* Bottom-left corner */}
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-brand rounded-bl-xl" />
              {/* Bottom-right corner */}
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-brand rounded-br-xl" />
            </div>
          </div>

          {/* Scanning line animation - only when camera is active */}
          {cameraStatus === 'active' && (
            <div className="absolute left-6 right-6 h-0.5 bg-brand animate-scan-line" />
          )}
        </div>

        {/* Student info */}
        {studentName && (
          <div className="text-center mb-3">
            <p className="text-base font-semibold text-black">{studentName}</p>
            {studentCode && (
              <p className="text-sm text-gray-500">{studentCode}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <p className="text-center text-sm text-[#666d80] mb-6 leading-relaxed px-2">
          Vui lòng đặt mã QR ngay trước máy ảnh, đảm bảo mã QR nằm chính giữa khung hình.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          {/* Primary button - Use different method */}
          <button
            onClick={handleManualAttendance}
            className="w-full h-[52px] bg-brand text-white text-base font-medium rounded-[14px] hover:bg-orange-500 transition-colors shadow-sm"
          >
            Dùng cách khác
          </button>

          {/* Secondary button - Later */}
          <button
            onClick={handleClose}
            className="w-full h-[52px] bg-white text-black text-base font-medium rounded-[14px] border border-[#E5E1DC] hover:bg-gray-50 transition-colors"
          >
            Để sau
          </button>
        </div>
      </div>

      {/* Scanning animation styles */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 24px;
            opacity: 1;
          }
          50% {
            top: calc(100% - 24px);
            opacity: 1;
          }
          100% {
            top: 24px;
            opacity: 1;
          }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
