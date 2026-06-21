import React from "react";

interface PhotoPreviewModalProps {
  previewPhotoRecordId: string;
  onClose: () => void;
}

export default function PhotoPreviewModal({ previewPhotoRecordId, onClose }: PhotoPreviewModalProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-3xl font-bold transition-colors"
      >
        ×
      </button>
      <div 
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {previewPhotoRecordId && (
          <img
            src={`/api/record-photo?id=${previewPhotoRecordId}`}
            alt="照片预览"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            style={{ 
              backgroundColor: 'white',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          />
        )}
      </div>
    </div>
  );
}
