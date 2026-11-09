import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface DeviceAppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBrowserMode?: () => void;
}

export const DeviceAppInstallModal: React.FC<DeviceAppInstallModalProps> = ({
  isOpen,
  onClose,
  onSelectBrowserMode,
}) => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'iphone' | 'mac' | 'windows' | 'android'>('iphone');
  const [installedNotice, setInstalledNotice] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await installApp();
      if (outcome === 'accepted') {
        setInstalledNotice(true);
        setTimeout(() => onClose(), 2500);
      }
    } else {
      // Guide user to device-specific tab
    }
  };

  const handleContinueBrowser = () => {
    localStorage.setItem('t20_prefer_browser_mode', 'true');
    if (onSelectBrowserMode) onSelectBrowserMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-start justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Universal Multi-Device Compatibility</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              T20 Server for All Your Devices
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Optimized for <strong>iPhone</strong>, <strong>MacBook</strong>, <strong>Windows PC</strong>, and <strong>Android</strong> in browser or as an app.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Main Options */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Continue in Web Browser */}
            <div
              onClick={handleContinueBrowser}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-slate-800 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-all group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-200 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center mb-3 transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Use in Web Browser
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Open immediately in Safari on iPhone/Mac, Chrome on Android, or Edge on Windows without downloading software.
                </p>
              </div>

              <button
                type="button"
                className="w-full py-2 bg-white group-hover:bg-slate-900 group-hover:text-white border border-slate-300 group-hover:border-slate-900 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Continue in Browser</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Option 2: Download / Install as App */}
            <div
              onClick={handleInstallClick}
              className="p-5 rounded-xl border-2 border-blue-600 bg-blue-50/60 hover:bg-blue-50 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-xs"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-sm">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-blue-950">Download as App (PWA)</h3>
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                    FREE
                  </span>
                </div>
                <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
                  Install as a standalone app on your iPhone, MacBook, Windows, or Android for offline caching and fast dock/home screen access.
                </p>
              </div>

              <button
                type="button"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstallable ? 'Install App Now' : 'Device Instructions'}</span>
              </button>
            </div>
          </div>

          {/* Device Tabs & Instructions for iPhone, Mac, Windows, Android */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Instructions by Device
            </span>

            {/* Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setActiveTab('iphone')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'iphone'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>

              <button
                onClick={() => setActiveTab('mac')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'mac'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>MacBook / macOS</span>
              </button>

              <button
                onClick={() => setActiveTab('windows')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'windows'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Windows PC</span>
              </button>

              <button
                onClick={() => setActiveTab('android')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'android'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
            </div>

            {/* Active Tab Explanation */}
            <div className="text-xs text-slate-600 space-y-2 pt-1">
              {activeTab === 'iphone' && (
                <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>On iPhone & iPad (Safari):</span>
                  </p>
                  <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Open this page in <strong>Safari</strong> on your iPhone or iPad.</li>
                    <li>Tap the <strong>Share</strong> button <Share2 className="w-3 h-3 inline text-blue-600 mx-0.5" /> at the bottom navigation bar.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen" <PlusSquare className="w-3 h-3 inline text-slate-700 mx-0.5" /></strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right. T20 Server will launch in full screen with zero browser bars!</li>
                  </ol>
                </div>
              )}

              {activeTab === 'mac' && (
                <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-slate-800" />
                    <span>On MacBook & Mac (Safari & Chrome):</span>
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-1 leading-relaxed">
                    <p><strong>Safari on macOS Sonoma+:</strong> Click <em>File → Add to Dock...</em> to pin T20 Server to your Mac dock.</p>
                    <p><strong>Chrome / Brave on Mac:</strong> Click the <strong>Install</strong> icon in the address bar (right side) to run in a standalone Mac application window.</p>
                  </div>
                </div>
              )}

              {activeTab === 'windows' && (
                <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                    <span>On Windows PC & Laptop (Edge / Chrome):</span>
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-1 leading-relaxed">
                    <p>In Microsoft Edge or Google Chrome, click the <strong>Install App</strong> button in the URL address bar or select <em>Settings & more (···) → Apps → Install this site as an app</em>.</p>
                    <p>You can pin T20 Server directly to your Windows Taskbar and Start Menu.</p>
                  </div>
                </div>
              )}

              {activeTab === 'android' && (
                <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>On Android Phone & Tablet (Chrome / Samsung Internet):</span>
                  </p>
                  <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Tap the <strong>3-dot menu</strong> (⋮) in the top right corner of Chrome.</li>
                    <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Confirm installation. T20 Server will appear in your app drawer and home screen.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            {isInstalled ? '✅ App installed on this device' : 'You can switch between modes at any time'}
          </span>
          <button
            onClick={handleContinueBrowser}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
