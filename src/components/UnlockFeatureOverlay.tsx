import React, { useEffect } from 'react';
import { ArrowLeft, ArrowUpRight, Instagram, Lock, X } from 'lucide-react';

interface UnlockFeatureOverlayProps {
  featureName: string;
  onReturn: () => void;
}

export const UnlockFeatureOverlay: React.FC<UnlockFeatureOverlayProps> = ({
  featureName,
  onReturn,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onReturn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturn]);

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-0 z-40 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-overlay-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onReturn();
        }
      }}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          boxShadow:
            '0 24px 60px -15px rgba(15, 23, 42, 0.24), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* Executive Dark Navy Top Band */}
        <div className="bg-slate-900 px-6 sm:px-8 py-6 text-white relative">
          <button
            type="button"
            onClick={onReturn}
            aria-label="返回頁面"
            className="absolute right-4 top-4 inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="h-11 w-11 rounded-xl bg-blue-950/90 border border-blue-400/25 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-blue-300" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-blue-200">
                {featureName} · 進階功能模組
              </p>
              <h2
                id="unlock-overlay-title"
                className="text-xl font-bold tracking-tight text-white text-balance"
              >
                解鎖完整教室系統功能
              </h2>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2.5">
            <p className="text-base font-semibold text-slate-900 leading-relaxed">
              如要解鎖所有功能，請在 Instagram 私信{' '}
              <span className="font-mono text-blue-800">lisir254</span> 聯絡。
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              價格將按您的教室規模與實際需求而有調整，支援專屬功能定製及長期技術支援。
            </p>
          </div>

          {/* Clean Hairline Feature Breakdown (Zero-Pill Discipline) */}
          <dl className="divide-y divide-slate-100 border-y border-slate-100 text-sm">
            <div className="py-3 flex items-baseline justify-between gap-4">
              <dt className="font-medium text-slate-900 whitespace-nowrap">日曆系統與出勤列印</dt>
              <dd className="text-xs sm:text-sm text-slate-500 text-right">
                每週課堂排程、即時點名及出勤紀錄表匯出
              </dd>
            </div>
            <div className="py-3 flex items-baseline justify-between gap-4">
              <dt className="font-medium text-slate-900 whitespace-nowrap">完整資料還原</dt>
              <dd className="text-xs sm:text-sm text-slate-500 text-right">
                支援 JSON 備份檔案一鍵還原與跨裝置同步
              </dd>
            </div>
            <div className="py-3 flex items-baseline justify-between gap-4">
              <dt className="font-medium text-slate-900 whitespace-nowrap">財務結算與整全報表</dt>
              <dd className="text-xs sm:text-sm text-slate-500 text-right">
                自動產生月度收入結算單及整全 PDF 報表
              </dd>
            </div>
          </dl>

          {/* Primary Instagram CTA & Secondary Return */}
          <div className="space-y-3 pt-1">
            <a
              href="https://www.instagram.com/lisir254/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 h-11 px-5 text-sm font-semibold text-white bg-slate-900 hover:bg-blue-900 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
            >
              <Instagram className="h-4 w-4 text-blue-300 shrink-0" aria-hidden="true" />
              <span>前往 Instagram 私信 @lisir254</span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 shrink-0" aria-hidden="true" />
            </a>

            <div className="flex items-center justify-between gap-4 pt-1">
              <button
                type="button"
                onClick={onReturn}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                返回頁面
              </button>
              <a
                href="https://www.instagram.com/lisir254/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-slate-400 hover:text-blue-800 transition-colors truncate"
              >
                instagram.com/lisir254
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
