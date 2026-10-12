import React from 'react';

export default function WalkInTicker() {
  const items = [
    'WALK-INS ONLY',
    '예약 불가 · 당일 현장 방문',
    '화–일 18:00–02:00',
    'LAST ORDER 01:30',
    '신사동 가로수길 2027',
    '총 30석 · 최대 4인',
    '전용 주차 가능',
  ];

  return (
    <aside
      aria-label="방문 안내 티커"
      className="bg-[#111C2D] text-[#F2ECDD] py-2.5 overflow-hidden border-y border-[#111C2D] select-none"
    >
      <div className="animate-ticker flex items-center whitespace-nowrap">
        {[...items, ...items, ...items].map((text, idx) => (
          <span key={idx} className="inline-flex items-center text-xs font-mono tracking-widest uppercase mx-6">
            <span className="w-2 h-2 rounded-full bg-[#E43D30] inline-block mr-3 shrink-0" />
            <span className="font-semibold">{text}</span>
          </span>
        ))}
      </div>
    </aside>
  );
}
