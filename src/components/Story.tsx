import React from 'react';
import { POCO_DATA } from '@/data/pocoContent';
import { BauhausCircle, BauhausSemiCircle } from './BauhausGraphics';

export default function Story() {
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="py-20 sm:py-28 bg-[#F2ECDD] border-b border-[#111C2D]/20 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Section Header: Number & Tag */}
        <div className="flex items-center justify-between border-b-2 border-[#111C2D] pb-4 mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm sm:text-base font-bold text-[#E43D30]">01 / PHILOSOPHY</span>
            <span className="text-[#111C2D]/30">|</span>
            <span className="font-mono text-xs sm:text-sm tracking-widest text-[#111C2D]/70 uppercase">
              Brand Story
            </span>
          </div>

          <div className="flex items-center gap-2">
            <BauhausSemiCircle width={28} height={14} color="#2447C6" orientation="top" />
            <BauhausCircle size={14} color="#E43D30" />
          </div>
        </div>

        {/* Story Lead Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-start">
          <div className="lg:col-span-5">
            <h2
              id="story-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111C2D] tracking-tight leading-tight"
            >
              {POCO_DATA.story.title}
            </h2>

            <div className="mt-6 flex items-center gap-3 pt-6 border-t border-[#111C2D]/15">
              <span className="w-3 h-3 bg-[#E43D30]" />
              <p className="text-sm font-mono text-[#111C2D]/80 font-medium">
                {POCO_DATA.brand.representative.name} · {POCO_DATA.brand.representative.role}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-base sm:text-lg lg:text-xl text-[#111C2D]/90 leading-relaxed font-normal">
              {POCO_DATA.story.lead}
            </p>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 px-5 bg-[#111C2D]/5 border border-[#111C2D]/15 text-xs font-mono">
              <div>
                <span className="text-[#111C2D]/50 block">LOCAL</span>
                <span className="font-semibold text-[#111C2D]">지역성</span>
              </div>
              <div>
                <span className="text-[#111C2D]/50 block">SEASONAL</span>
                <span className="font-semibold text-[#111C2D]">계절성</span>
              </div>
              <div>
                <span className="text-[#111C2D]/50 block">FERMENT</span>
                <span className="font-semibold text-[#111C2D]">자연 발효</span>
              </div>
              <div>
                <span className="text-[#111C2D]/50 block">LOW ABV</span>
                <span className="font-semibold text-[#111C2D]">저도수</span>
              </div>
            </div>
          </div>
        </div>

        {/* Three Principles: Editorial Bauhaus Grid */}
        <div className="mt-16 sm:mt-24 pt-12 border-t border-[#111C2D]/20">
          <p className="text-xs font-mono tracking-widest text-[#111C2D]/60 uppercase mb-8">
            THREE PRINCIPLES OF POCO
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {POCO_DATA.story.principles.map((principle, index) => {
              const borderColors = ['border-[#E43D30]', 'border-[#2447C6]', 'border-[#111C2D]'];
              const accentColor = borderColors[index % borderColors.length];

              return (
                <div
                  key={principle.number}
                  className={`bg-[#F2ECDD] border-t-4 ${accentColor} border-r border-b border-l border-[#111C2D]/15 p-6 sm:p-8 flex flex-col justify-between group hover:shadow-lg transition-all`}
                >
                  <div>
                    <div className="flex items-baseline justify-between mb-6">
                      <span className="font-mono text-4xl sm:text-5xl font-black text-[#111C2D]/25 group-hover:text-[#111C2D] transition-colors">
                        {principle.number}
                      </span>
                      {index === 0 && <BauhausCircle size={16} color="#E43D30" />}
                      {index === 1 && <span className="w-4 h-4 bg-[#2447C6]" />}
                      {index === 2 && <BauhausSemiCircle width={20} height={10} color="#F3C638" orientation="top" />}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-mono tracking-wider text-[#111C2D] uppercase leading-snug">
                      {principle.enTitle}
                    </h3>
                  </div>

                  <p className="mt-6 text-sm sm:text-base text-[#111C2D]/85 leading-relaxed pt-4 border-t border-[#111C2D]/10">
                    {principle.koDescription}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
