import React from 'react';
import Image from 'next/image';
import { POCO_DATA } from '@/data/pocoContent';
import { BauhausCircle, BauhausSemiCircle } from './BauhausGraphics';

export default function Pairing() {
  return (
    <section
      aria-label="페어링 경험과 차별점"
      className="py-20 sm:py-28 bg-[#111C2D] text-[#F2ECDD] relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Editorial Eyebrow */}
        <div className="flex items-center justify-between border-b border-[#F2ECDD]/20 pb-4 mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm sm:text-base font-bold text-[#F3C638]">03 / EXPERIENCE</span>
            <span className="text-[#F2ECDD]/30">|</span>
            <span className="font-mono text-xs sm:text-sm tracking-widest text-[#F2ECDD]/70 uppercase">
              Food & Beverage Pairing
            </span>
          </div>

          <div className="flex items-center gap-2">
            <BauhausCircle size={14} color="#F3C638" />
            <BauhausSemiCircle width={28} height={14} color="#E43D30" orientation="top" />
          </div>
        </div>

        {/* Big Editorial Statement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-[#F2ECDD]">
              {POCO_DATA.pairing.title}
            </h2>

            <div className="w-16 h-1 bg-[#E43D30] my-6" />

            <p className="text-base sm:text-lg text-[#F2ECDD]/85 leading-relaxed font-normal">
              {POCO_DATA.pairing.content}
            </p>

            <div className="pt-6 grid grid-cols-2 gap-6 border-t border-[#F2ECDD]/15 text-sm font-mono">
              <div>
                <span className="text-[#F3C638] font-bold block mb-1">DATE NIGHT</span>
                <span className="text-[#F2ECDD]/75 text-xs sm:text-sm">둘만의 대화와 요리에 스며드는 페어링</span>
              </div>
              <div>
                <span className="text-[#2447C6] font-bold block mb-1">SOLO DRINKING</span>
                <span className="text-[#F2ECDD]/75 text-xs sm:text-sm">편안하고 정확한 서비스 속 온전한 휴식</span>
              </div>
            </div>
          </div>

          {/* Large Editorial Process Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative w-full aspect-[16/10] bg-[#111C2D] border-2 border-[#F2ECDD]/30 shadow-2xl overflow-hidden group">
              <Image
                src={POCO_DATA.media.ingredientProcess.src}
                alt={POCO_DATA.media.ingredientProcess.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Bauhaus Stamp Tag */}
              <div className="absolute top-0 right-0 bg-[#F3C638] text-[#111C2D] px-3 py-1 font-mono text-[11px] font-bold tracking-widest uppercase">
                PROCESS & CIRCULAR
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#111C2D] via-[#111C2D]/50 to-transparent">
                <span className="text-xs font-mono tracking-widest text-[#F2ECDD]/90">
                  SEASONAL FERMENTATION & BALANCE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
