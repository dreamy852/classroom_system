import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Download, Loader2, X } from 'lucide-react';
import { TransactionRecord } from '../types/transaction';

export type DocumentType = 'quotation' | 'receipt';

interface DocumentPreviewModalProps {
  record: TransactionRecord | null;
  docType: DocumentType | null;
  classroomAddress: string;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return `HK$${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 1,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDocNumber(type: DocumentType, record: TransactionRecord): string {
  const prefix = type === 'quotation' ? 'QT' : 'RC';
  const datePart = formatDate(record.createdAt).replace(/-/g, '');
  const cleanId = record.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0001';
  return `${prefix}-${datePart}-${cleanId}`;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  record,
  docType,
  classroomAddress,
  onClose,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    setDownloadError('');
    setIsGenerating(false);
  }, [record, docType]);

  useEffect(() => {
    if (!record || !docType) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, docType, isGenerating, onClose]);

  if (!record || !docType) return null;

  const isQuotation = docType === 'quotation';
  const docTitleZh = isQuotation ? '報價單' : '正式收據';
  const docTitleEn = isQuotation ? 'QUOTATION' : 'OFFICIAL RECEIPT';
  const docNumber = buildDocNumber(docType, record);
  const formattedDate = formatDate(record.createdAt);
  const trialAmount = record.includesTrial ? record.trialFee : 0;
  const totalAmount = Math.round((record.price + trialAmount) * 100) / 100;

  const handleDownloadPdf = async () => {
    if (!sheetRef.current || isGenerating) return;
    setIsGenerating(true);
    setDownloadError('');

    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const printableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      let finalWidth = printableWidth;
      let finalHeight = imgHeight;
      if (imgHeight > pageHeight - margin * 2) {
        finalHeight = pageHeight - margin * 2;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const xOffset = (pageWidth - finalWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, margin, finalWidth, finalHeight);

      const safeStudentName = record.studentName.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `教室系統_${docTitleZh}_${safeStudentName}_${formattedDate}.pdf`;
      pdf.save(fileName);
    } catch {
      setDownloadError('產生 PDF 時發生錯誤，請再試一次。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Modal Top Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2
              id="preview-modal-title"
              className="text-base font-semibold text-slate-900 whitespace-nowrap"
            >
              {docTitleZh}預覽
            </h2>
            <span className="text-xs font-mono text-slate-500 truncate">{docNumber}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              {isGenerating ? '產生中...' : '下載 PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              aria-label="關閉預覽"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 text-xs font-medium text-red-700">
            {downloadError}
          </div>
        )}

        {/* Preview Stage */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8">
          <div
            ref={sheetRef}
            className="mx-auto w-full max-w-[660px] bg-white border border-slate-200 p-8 sm:p-10 text-slate-900 shadow-xs"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-200">
              <div className="space-y-1.5">
                <p className="text-2xl font-bold tracking-tight text-slate-900">教室系統</p>
                <p className="text-xs text-slate-600">{classroomAddress}</p>
              </div>

              <div className="sm:text-right space-y-1">
                <p className="text-xl font-bold tracking-tight text-blue-800">{docTitleZh}</p>
                <p className="text-xs font-mono tracking-wider text-slate-400">{docTitleEn}</p>
                <div className="pt-1.5 space-y-0.5 text-xs text-slate-600 font-mono tabular-nums">
                  <p>編號：{docNumber}</p>
                  <p>日期：{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Student / Course Info */}
            <div className="py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">學生姓名（編號）</p>
                <p className="text-base font-semibold text-slate-900">
                  {record.studentName}{' '}
                  <span className="font-mono text-sm font-medium text-slate-500">
                    ({record.studentId})
                  </span>
                </p>
              </div>
              <div className="space-y-1 sm:text-right">
                <p className="text-xs font-medium text-slate-500">科目、年級及形式</p>
                <p className="text-base font-medium text-slate-900">
                  {record.subject} · {record.grade} · {record.format}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-6">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-2.5 pr-4">
                      項目說明
                    </th>
                    <th scope="col" className="py-2.5 px-4 text-right whitespace-nowrap">
                      堂數
                    </th>
                    <th scope="col" className="py-2.5 pl-4 text-right whitespace-nowrap">
                      金額
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3.5 pr-4">
                      <p className="font-medium text-slate-900">
                        {record.subject}課程（{record.grade} · {record.format}）
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {record.lessons} 堂
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(record.price)}
                    </td>
                  </tr>

                  {record.includesTrial && (
                    <tr>
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-slate-900">試堂費</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        連試堂
                      </td>
                      <td className="py-3.5 pl-4 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(record.trialFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="mt-4 pt-4 border-t-2 border-slate-900 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {isQuotation ? '報價總額' : '實收總額'}
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Footer / Signature */}
            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-500">
              <div className="space-y-1.5 leading-relaxed">
                <p className="font-medium text-slate-700">備註</p>
                {isQuotation ? (
                  <p>此報價單自發出日期起 3 天內有效。如有任何查詢，歡迎聯絡教室。</p>
                ) : (
                  <p>款項已收妥，多謝惠顧。請保留此收據作日後查閱之用。</p>
                )}
                <p>地址：{classroomAddress}</p>
              </div>

              <div className="sm:text-right shrink-0 pt-4 sm:pt-0">
                <div className="inline-block min-w-[140px] border-t border-slate-400 pt-2 text-center font-medium text-slate-700">
                  {isQuotation ? '教室系統 報價' : '教室系統 簽收'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
