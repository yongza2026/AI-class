import React from 'react';
import Image from 'next/image';
import { POCO_DATA } from '@/data/pocoContent';

export default function Menu() {
  return (
    <section
      id="menu"
      aria-labelledby="menu-title"
      className="py-20 sm:py-28 bg-[#F2ECDD] border-b border-[#111C2D]/20 relative"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-[#111C2D] pb-6 mb-12 sm:mb-16 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-[#E43D30] tracking-wider mb-2">
              <span>02 / SIGNATURE DRINKS</span>
              <span className="text-[#111C2D]/40">·</span>
              <span className="text-[#111C2D]/70 font-normal">SEASONAL SELECTION</span>
            </div>
            <h2
              id="menu-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111C2D] tracking-tight font-['Space_Grotesk'] uppercase"
            >
              THREE SIGNATURES
            </h2>
          </div>

          <p className="text-sm sm:text-base text-[#111C2D]/80 font-medium max-w-md">
            지역과 발효의 감각을 담은 POCO의 첫 세 잔.
          </p>
        </div>

        {/* 3 Signatures Cards Grid + Visual Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Three Drink Cards (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {POCO_DATA.signatures.map((drink, idx) => (
                <div
                  key={drink.id}
                  className="group relative bg-[#F2ECDD] border-2 border-[#111C2D] p-6 flex flex-col justify-between min-h-[260px] hover:bg-[#111C2D] transition-colors duration-300"
                >
                  {/* Top Bar: Number & Bauhaus Shape */}
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-2xl font-black text-[#111C2D] group-hover:text-[#F2ECDD] transition-colors">
                      {drink.number}
                    </span>

                    {/* Shape with subtle 6px translate on hover */}
                    <div className="transform group-hover:translate-x-1.5 group-hover:-translate-y-1.5 transition-transform duration-300">
                      {drink.shape === 'circle' && (
                        <div className="w-7 h-7 rounded-full bg-[#E43D30]" />
                      )}
                      {drink.shape === 'semicircle' && (
                        <div className="w-8 h-4 bg-[#F3C638] rounded-t-full" />
                      )}
                      {drink.shape === 'rectangle' && (
                        <div className="w-6 h-6 bg-[#2447C6]" />
                      )}
                    </div>
                  </div>

                  {/* Center Content: Drink Name */}
                  <div className="my-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#111C2D] group-hover:text-[#F2ECDD] tracking-tight transition-colors">
                      {drink.name}
                    </h3>
                    <p className="mt-2 text-xs font-mono tracking-widest text-[#111C2D]/60 group-hover:text-[#F2ECDD]/60 transition-colors uppercase">
                      Signature 0{idx + 1}
                    </p>
                  </div>

                  {/* Bottom: Price */}
                  <div className="pt-4 border-t border-[#111C2D]/15 group-hover:border-[#F2ECDD]/20 transition-colors flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#111C2D] group-hover:text-[#F2ECDD] transition-colors">
                        {drink.priceFormatted}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#111C2D]/70 group-hover:text-[#F2ECDD]/70 transition-colors">
                        {drink.currency}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono tracking-wider text-[#E43D30] group-hover:text-[#F3C638] transition-colors">
                      LOW ABV
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Food Menu In Progress Banner */}
            <div className="bg-[#111C2D] text-[#F2ECDD] p-6 sm:p-8 border-2 border-[#111C2D] relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#F3C638] rounded-full shrink-0" />
                  <div>
                    <span className="font-mono text-xs tracking-widest text-[#F3C638] font-bold uppercase block mb-1">
                      {POCO_DATA.foodNotice.status}
                    </span>
                    <p className="text-base sm:text-lg font-medium text-[#F2ECDD]">
                      {POCO_DATA.foodNotice.description}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-xs tracking-wider text-[#F2ECDD]/60 shrink-0 self-start sm:self-center">
                  PAIRING READY 2027
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Drink Mood Editorial Image (4 Cols) */}
          <div className="lg:col-span-4 relative flex flex-col">
            <div className="relative w-full h-full min-h-[380px] bg-[#111C2D] border-2 border-[#111C2D] overflow-hidden group">
              <Image
                src={POCO_DATA.media.drinkMood.src}
                alt={POCO_DATA.media.drinkMood.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 35vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Bauhaus Overlay Details */}
              <div className="absolute top-4 left-4 bg-[#F2ECDD] text-[#111C2D] px-2.5 py-1 text-[11px] font-mono font-bold tracking-widest uppercase">
                MOOD STILL LIFE
              </div>

              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#111C2D] to-transparent text-[#F2ECDD]">
                <p className="text-xs font-mono tracking-wider text-[#F2ECDD]/80">
                  BALANCED GLASSWARE & TEXTURE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
