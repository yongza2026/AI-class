'use client';

import React from 'react';
import { POCO_DATA } from '@/data/pocoContent';
import { BauhausCircle, BauhausSemiCircle } from './BauhausGraphics';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#111C2D] text-[#F2ECDD] pt-16 pb-12 border-t border-[#111C2D] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Top Footer Row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between pb-12 border-b border-[#F2ECDD]/15 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-3">
              <BauhausCircle size={18} color="#E43D30" />
              <span className="font-['Space_Grotesk'] text-xl font-bold tracking-widest text-[#F2ECDD]">
                {POCO_DATA.brand.name}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#F2ECDD]/75 leading-relaxed">
              조금씩, 음식과 함께. 지역과 제철의 재료로 만든 저도수 음료를 음식과 페어링하는 로컬 드링커리.
            </p>

            <p className="text-xs font-mono text-[#F3C638] tracking-widest">
              SEOUL · SINSA · 2027
            </p>
          </div>

          {/* Core Brand Keywords */}
          <div className="flex flex-col space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-[#F2ECDD]/50 uppercase">
              CORE PHILOSOPHY
            </span>
            <div className="text-xs sm:text-sm font-mono tracking-wider text-[#F2ECDD]/90 space-y-1">
              <div>LOCAL / SEASONAL</div>
              <div>FERMENTATION / LOW ABV</div>
              <div>PAIRING BALANCE</div>
            </div>
          </div>

          {/* Quick Anchor Links */}
          <div className="flex flex-col space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-[#F2ECDD]/50 uppercase">
              NAVIGATION
            </span>
            <div className="flex flex-col space-y-1.5 text-xs font-mono">
              <a href="#story" className="text-[#F2ECDD]/80 hover:text-[#E43D30] transition-colors">
                STORY →
              </a>
              <a href="#menu" className="text-[#F2ECDD]/80 hover:text-[#E43D30] transition-colors">
                SIGNATURE MENU →
              </a>
              <a href="#visit" className="text-[#F2ECDD]/80 hover:text-[#E43D30] transition-colors">
                VISIT GUIDE →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Bauhaus Graphics */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#F2ECDD]/60">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[#2447C6]" />
            <span>© {currentYear} {POCO_DATA.brand.name}. ALL RIGHTS RESERVED.</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#F2ECDD]/50">
            <span>WALK-INS ONLY · NO RESERVATIONS</span>
            <BauhausSemiCircle width={20} height={10} color="#F3C638" orientation="top" />
          </div>
        </div>
      </div>
    </footer>
  );
}
