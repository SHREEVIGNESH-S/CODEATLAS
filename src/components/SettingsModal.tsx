import React from 'react';
import { X, Cpu, Sparkles, Sliders, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisDepth: 'standard' | 'deep';
  setAnalysisDepth: (d: 'standard' | 'deep') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  analysisDepth,
  setAnalysisDepth
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-base text-[#101828]">CODEATLAS Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              AST Analysis Depth
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAnalysisDepth('standard')}
                className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                  analysisDepth === 'standard'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-1 ring-blue-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold mb-0.5">Standard</div>
                <div className="text-[11px] text-slate-500">Fast parsing of top 25 files</div>
              </button>

              <button
                type="button"
                onClick={() => setAnalysisDepth('deep')}
                className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                  analysisDepth === 'deep'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-semibold ring-1 ring-blue-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold mb-0.5">Deep Synthesis</div>
                <div className="text-[11px] text-slate-500">Full recursive tree analysis</div>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              AI Intelligence Engine
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Powered by <strong>Gemini 3.8 Flash</strong> with server-side AST code context grounding. Automatic offline rule engine fallback active during API quotas.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Zero-Execution Sandbox</div>
              <div className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Repository code is statically parsed for syntax and relationships. Code is never executed on the host.
              </div>
            </div>
          </div>

        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
};
