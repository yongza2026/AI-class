import React from 'react';
import Image from 'next/image';
import { POCO_DATA } from '@/data/pocoContent';
import { ArrowDownRight } from 'lucide-react';
import { BauhausCircle, BauhausSemiCircle } from './BauhausGraphics';

export default function Hero() {
  return (
    <section
      aria-label="소개 첫 화면"
      className="relative min-h-[92vh] sm:min-h-screen pt-20 sm:pt-24 pb-12 flex flex-col justify-between overflow-hidden border-b border-[#111C2D]/20 bg-[#F2ECDD]"
    >
      {/* Asymmetric Bauhaus Background Watermark / Grid Lines */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-10">
        <span className="absolute -bottom-10 -right-10 text-[20vw] font-black text-[#111C2D] leading-none tracking-tighter">
          POCO
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full flex-1 flex flex-col justify-between z-10">
        {/* Top Status Badges Row */}
        <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#111C2D]/15 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#E43D30] rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-[#111C2D]">
              {POCO_DATA.brand.statusLabel}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#111C2D] text-[#F2ECDD] text-[11px] sm:text-xs font-mono font-bold tracking-widest">
            <span className="w-1.5 h-1.5 bg-[#E43D30] rounded-full" />
            <span>{POCO_DATA.brand.walkInNotice}</span>
          </div>
        </div>

        {/* Main Hero Content: Asymmetrical Typography & Editorial Visual */}
        <div className="my-auto py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Big Typography & Bauhaus Accents */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Geometric Accent Row */}
            <div className="flex items-center gap-3 mb-3">
              <BauhausCircle size={20} color="#E43D30" />
              <BauhausSemiCircle width={32} height={16} color="#2447C6" orientation="top" />
              <span className="text-xs font-mono tracking-widest text-[#111C2D]/70 uppercase">
                {POCO_DATA.brand.category}
              </span>
            </div>

            {/* Giant Title */}
            <div className="relative">
              <h1 className="text-6xl xs:text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-[#111C2D] leading-[0.9] uppercase font-['Space_Grotesk']">
                {POCO_DATA.brand.shortName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm font-mono tracking-[0.3em] text-[#111C2D]/80 uppercase font-semibold">
                {POCO_DATA.brand.category}
              </p>
            </div>

            {/* Main & Sub Copies */}
            <div className="mt-5 sm:mt-8 pl-3 border-l-3 border-[#E43D30]">
              <p className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-[#111C2D] tracking-tight">
                {POCO_DATA.brand.tagline}
              </p>
              <p className="mt-2 text-sm sm:text-base text-[#111C2D]/85 leading-relaxed max-w-xl font-normal">
                {POCO_DATA.brand.heroSubCopy}
              </p>
            </div>

            {/* CTA and Walk-in Notice Row */}
            <div className="mt-6 sm:mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#menu"
                id="hero-menu-cta"
                className="group inline-flex items-center gap-3 px-7 py-3.5 bg-[#E43D30] text-[#F2ECDD] font-semibold text-sm tracking-wider hover:bg-[#111C2D] transition-colors focus-visible:ring-2 focus-visible:ring-[#111C2D]"
              >
                <span>메뉴 보기</span>
                <ArrowDownRight
                  size={18}
                  className="group-hover:translate-x-1 group-hover:translate-y-1 transition-transform"
                />
              </a>

              <div className="inline-flex items-center gap-2.5 px-4 py-3 bg-[#111C2D]/5 border border-[#111C2D]/20 text-xs sm:text-sm font-medium text-[#111C2D]">
                <span className="w-2 h-2 rounded-full bg-[#2447C6]" />
                <span className="font-mono font-bold tracking-wider">WALK-INS ONLY</span>
                <span className="text-[#111C2D]/60 hidden xs:inline">· 예약 불가</span>
              </div>
            </div>
          </div>

          {/* Right Column: Bauhaus Architectural Visual Asset */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            <div className="relative w-full aspect-[16/10] lg:aspect-[4/3] bg-[#111C2D] border-2 border-[#111C2D] shadow-xl overflow-hidden group">
              <Image
                src={POCO_DATA.media.heroInterior.src}
                alt={POCO_DATA.media.heroInterior.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Bauhaus Color Tag Overlay */}
              <div className="absolute top-0 right-0 bg-[#E43D30] text-[#F2ECDD] px-3 py-1 font-mono text-[11px] tracking-widest uppercase">
                INTERIOR 01
              </div>

              {/* Bauhaus Subtle Border Accent */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#111C2D]/90 via-[#111C2D]/40 to-transparent flex items-end justify-between">
                <span className="text-[11px] font-mono tracking-widest text-[#F2ECDD]/90">
                  SEOUL SINSA · 2027
                </span>
                <span className="w-3 h-3 bg-[#F3C638] rounded-full" />
              </div>
            </div>

            {/* Asymmetrical Bauhaus Geometric Floating Pin */}
            <div className="hidden sm:block absolute -bottom-4 -left-4 w-12 h-12 bg-[#2447C6] border-2 border-[#F2ECDD] z-20 pointer-events-none" />
          </div>
        </div>

        {/* Bottom Editorial Meta Bar */}
        <div className="pt-4 border-t border-[#111C2D]/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-[#111C2D]/80">
          <div>
            <span className="block text-[10px] text-[#111C2D]/50 uppercase">LOCATION</span>
            <span className="font-semibold">서울 신사동 가로수길</span>
          </div>
          <div>
            <span className="block text-[10px] text-[#111C2D]/50 uppercase">HOURS</span>
            <span className="font-semibold">18:00 – 02:00 (월 휴무)</span>
          </div>
          <div>
            <span className="block text-[10px] text-[#111C2D]/50 uppercase">CAPACITY</span>
            <span className="font-semibold">총 30석 · 최대 4인</span>
          </div>
          <div>
            <span className="block text-[10px] text-[#111C2D]/50 uppercase">POLICY</span>
            <span className="font-semibold text-[#E43D30]">워크인 온리 (NO RSVD)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
