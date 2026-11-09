import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Monitor, Tablet, X, Check, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already installed and running standalone, hide the prompt
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 5000);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs border ${
            isInstallable
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          } ${className}`}
          title="Install app on PC, Phone or Tablet"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showGuideModal && (
          <MultiDeviceInstallModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
          isInstallable
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
        } ${className}`}
        title="Install T20 Server App on this device"
      >
        <div className="flex items-center gap-1 text-[11px] opacity-90">
          <Monitor className="w-3 h-3" />
          <Tablet className="w-3 h-3" />
          <Smartphone className="w-3 h-3" />
        </div>
        <span className="font-semibold">
          {justInstalled ? 'Installed ✓' : isInstallable ? 'Install App' : 'Get App (PC/Mobile)'}
        </span>
      </button>

      {showGuideModal && (
        <MultiDeviceInstallModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} />
      )}
    </>
  );
};

interface ModalProps {
  onClose: () => void;
  isIOS: boolean;
}

export const MultiDeviceInstallModal: React.FC<ModalProps> = ({ onClose, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
              T20
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Install T20 Server
              </h3>
              <p className="text-xs text-slate-500">
                Universal Multi-Device Access (PC, Phone & Tablet)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Option 1: Mobile / Phone (Android & iPhone) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Smartphones (Android & iPhone)</span>
            </div>
            {isIOS ? (
              <div className="text-slate-600 space-y-1.5 pl-6 text-[11px] leading-relaxed">
                <div className="flex items-center gap-1.5">
                  <span>1. Tap the</span>
                  <strong className="inline-flex items-center gap-1 bg-slate-200 px-1.5 py-0.5 rounded font-mono">
                    <Share2 className="w-3 h-3 text-blue-600" /> Share
                  </strong>
                  <span>button in Safari.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>2. Scroll down and tap</span>
                  <strong className="inline-flex items-center gap-1 bg-slate-200 px-1.5 py-0.5 rounded font-mono">
                    <PlusSquare className="w-3 h-3 text-emerald-600" /> Add to Home Screen
                  </strong>
                  <span>.</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 pl-6 text-[11px] leading-relaxed">
                In Chrome / browser menu (<strong>⋮</strong>), tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
              </p>
            )}
          </div>

          {/* Option 2: Tablets (iPad & Android Tablets) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Tablet className="w-4 h-4 text-blue-600" />
              <span>Tablets (iPad, Galaxy Tab, etc.)</span>
            </div>
            <p className="text-slate-600 pl-6 text-[11px] leading-relaxed">
              Enjoy a dedicated tablet split-screen and full-screen data entry experience. Tap the browser share or menu button to install as a standalone tablet application.
            </p>
          </div>

          {/* Option 3: PC / Desktop (Windows, Mac, Linux) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Monitor className="w-4 h-4 text-indigo-600" />
              <span>PC / Laptop (Chrome, Edge, Brave)</span>
            </div>
            <p className="text-slate-600 pl-6 text-[11px] leading-relaxed">
              Click the install icon in the browser address bar (top right) or press <strong>Install T20 Server</strong> to launch from your desktop or taskbar.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
