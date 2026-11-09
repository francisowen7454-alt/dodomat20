import React from 'react';
import { X, ZoomIn, Download, ExternalLink, Calendar, User, FileText } from 'lucide-react';
import { IncomingGood } from '../../types';
import { SecurityService } from '../../services/security';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingGood: IncomingGood | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, incomingGood }) => {
  if (!isOpen || !incomingGood) return null;

  const safePhotoUrl = SecurityService.sanitizeSafeUrl(incomingGood.receiptPhotoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Incoming Goods Receipt Archive</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ref ID: <span className="font-mono text-slate-300">{incomingGood.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt metadata bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Received Date: <strong className="text-slate-900 font-mono">{incomingGood.receivedDate}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Receiver: <strong className="text-slate-900">{incomingGood.receivedBy}</strong></span>
          </div>
          <div className="truncate">
            Supplier / Source: <strong className="text-slate-900 truncate">{incomingGood.supplierOrSource}</strong>
          </div>
        </div>

        {/* Image Preview Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center min-h-[350px]">
          <div className="relative max-w-full max-h-full">
            <img
              src={safePhotoUrl}
              alt={`Receipt for ${incomingGood.supplierOrSource}`}
              className="max-h-[60vh] max-w-full object-contain rounded-md shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Footer Notes & Actions */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-600 text-[11px] max-w-md">
            <span className="font-semibold text-slate-800">Description: </span>
            <span>{incomingGood.packageDescription || incomingGood.notes || 'Official delivery receipt archived.'}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={safePhotoUrl}
              download={incomingGood.receiptFileName || `receipt-${incomingGood.id}.jpg`}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-md flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download Image</span>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
