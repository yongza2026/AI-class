import React from 'react';
import { POCO_DATA } from '@/data/pocoContent';
import { Clock, MapPin, Users, Car, AlertCircle } from 'lucide-react';
import { BauhausCircle } from './BauhausGraphics';

export default function Visit() {
  return (
    <section
      id="visit"
      aria-labelledby="visit-title"
      className="py-20 sm:py-28 bg-[#F2ECDD] border-b border-[#111C2D]/20 relative"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-[#111C2D] pb-6 mb-12 sm:mb-16 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-[#E43D30] tracking-wider mb-2">
              <span>04 / VISIT GUIDE</span>
              <span className="text-[#111C2D]/40">·</span>
              <span className="text-[#111C2D]/70 font-normal">WALK-INS ONLY</span>
            </div>
            <h2
              id="visit-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111C2D] tracking-tight font-['Space_Grotesk'] uppercase"
            >
              {POCO_DATA.visit.title}
            </h2>
          </div>

          {/* Opening Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#111C2D] text-[#F2ECDD] text-xs font-mono font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#E43D30] animate-ping" />
            <span>{POCO_DATA.visit.openSchedule}</span>
          </div>
        </div>

        {/* Visit Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Operating Hours & Days */}
          <div className="bg-[#F2ECDD] border-2 border-[#111C2D] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs tracking-widest text-[#111C2D]/60 uppercase font-bold">
                  OPERATION
                </span>
                <Clock size={20} className="text-[#E43D30]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#111C2D] tracking-tight">
                {POCO_DATA.visit.operatingDays}
              </h3>

              <p className="mt-2 text-sm font-mono font-bold text-[#E43D30]">
                {POCO_DATA.visit.lastOrder}
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-[#111C2D]/15 flex items-center justify-between">
              <span className="text-xs font-mono text-[#111C2D]/70">REGULAR HOLIDAY</span>
              <span className="text-sm font-bold text-[#111C2D]">{POCO_DATA.visit.holiday}</span>
            </div>
          </div>

          {/* Card 2: Walk-In & Seating Policy */}
          <div className="bg-[#111C2D] text-[#F2ECDD] border-2 border-[#111C2D] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs tracking-widest text-[#F3C638] uppercase font-bold">
                  POLICY
                </span>
                <Users size={20} className="text-[#F3C638]" />
              </div>

              <div className="inline-block px-3 py-1 bg-[#E43D30] text-[#F2ECDD] text-xs font-mono font-bold tracking-widest mb-3">
                {POCO_DATA.visit.walkInOnly}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#F2ECDD] tracking-tight">
                {POCO_DATA.visit.seating}
              </h3>
            </div>

            <div className="mt-8 pt-4 border-t border-[#F2ECDD]/20">
              <div className="flex items-start gap-2 text-xs sm:text-sm text-[#F2ECDD]/85 leading-relaxed">
                <AlertCircle size={16} className="text-[#F3C638] shrink-0 mt-0.5" />
                <span>{POCO_DATA.visit.waiting}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Location & Parking */}
          <div className="bg-[#F2ECDD] border-2 border-[#111C2D] p-6 sm:p-8 flex flex-col justify-between md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs tracking-widest text-[#111C2D]/60 uppercase font-bold">
                  LOCATION & PARKING
                </span>
                <MapPin size={20} className="text-[#2447C6]" />
              </div>

              {/* 실제 공개 전 주소 교체 필요 (개발용 주석) */}
              <h3 className="text-lg sm:text-xl font-bold text-[#111C2D] leading-snug">
                {POCO_DATA.visit.address}
              </h3>

              <p className="mt-2 text-xs font-mono text-[#111C2D]/70">
                {POCO_DATA.visit.locationHint} · 2027 상반기 오픈
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-[#111C2D]/15 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111C2D]">
                <Car size={18} className="text-[#2447C6]" />
                <span>{POCO_DATA.visit.parking}</span>
              </div>
              <span className="text-[11px] font-mono text-[#111C2D]/60">FREE</span>
            </div>
          </div>
        </div>

        {/* Policy Summary Callout Bar */}
        <div className="mt-10 p-5 bg-[#111C2D]/5 border border-[#111C2D]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BauhausCircle size={16} color="#E43D30" />
            <p className="text-xs sm:text-sm text-[#111C2D]/90 font-medium">
              POCO는 모든 손님에게 공평하고 편안한 자리를 위해 <strong>예약을 받지 않으며 워크인으로만 운영</strong>됩니다.
            </p>
          </div>

          <span className="text-xs font-mono text-[#111C2D]/60 shrink-0">
            NO RESERVATION SYSTEM
          </span>
        </div>
      </div>
    </section>
  );
}
