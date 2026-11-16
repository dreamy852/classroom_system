import React from 'react';

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const;

export const CalendarModule: React.FC = () => {
  return (
    <section aria-labelledby="calendar-heading" className="space-y-6">
      <div className="space-y-1.5">
        <h1
          id="calendar-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 text-balance"
        >
          日曆系統
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="flex flex-col min-h-[160px] md:min-h-[360px]">
              <div className="px-3.5 py-3 border-b border-slate-200 bg-slate-50/70">
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </div>
              <div className="flex-1 p-3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
