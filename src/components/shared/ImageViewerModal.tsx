import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { SecurityService } from '../../services/security';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Preview',
  subtitle,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);

  if (!isOpen || !imageUrl) return null;

  // Defensive URL validation (blocks javascript: and malicious protocols)
  const safeUrl = SecurityService.sanitizeSafeUrl(imageUrl);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span>{title}</span>
            </h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleZoomIn}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Rotate 90deg"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href={safeUrl}
              download="t20_image.jpg"
              className="p-1.5 sm:p-2 rounded-lg bg-blue-600/30 border border-blue-400/30 text-blue-300 hover:text-white hover:bg-blue-600 transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-2"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 min-h-[360px]">
          {hasError ? (
            <div className="text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-900/30 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">Image Failed to Load</p>
              <p className="text-xs text-slate-500 max-w-sm">
                The image file is unavailable or could not be loaded in the browser.
              </p>
            </div>
          ) : (
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={safeUrl}
                alt={title}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg select-none"
                onError={() => setHasError(true)}
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Zoom: <strong>{Math.round(zoom * 100)}%</strong> | Rotation: <strong>{rotation}°</strong>
          </span>
          <button
            onClick={handleReset}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
};
