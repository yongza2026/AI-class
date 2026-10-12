'use client';

import React, { useState, useEffect } from 'react';
import { POCO_DATA } from '@/data/pocoContent';
import { Menu as MenuIcon, X } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'STORY', href: '#story' },
    { name: 'MENU', href: '#menu' },
    { name: 'VISIT', href: '#visit' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#F2ECDD]/90 backdrop-blur-md border-b border-[#111C2D]/15 shadow-xs py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#"
          className="group flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-widest text-[#111C2D] focus-visible:ring-2 focus-visible:ring-[#E43D30]"
          aria-label="POCO DRINKERY 홈으로 이동"
        >
          <span className="w-2.5 h-2.5 bg-[#E43D30] rounded-full inline-block group-hover:scale-125 transition-transform" />
          <span className="font-['Space_Grotesk'] font-bold uppercase tracking-wider">
            {POCO_DATA.brand.name}
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-8"
          aria-label="메인 내비게이션"
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs tracking-widest font-semibold text-[#111C2D]/80 hover:text-[#111C2D] relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#E43D30] hover:after:w-full after:transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E43D30]"
            >
              {link.name}
            </a>
          ))}

          {/* Primary Action Button */}
          <a
            href="#menu"
            id="header-menu-cta"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111C2D] text-[#F2ECDD] text-xs font-semibold tracking-wider hover:bg-[#E43D30] transition-colors border border-[#111C2D] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E43D30]"
          >
            <span className="w-1.5 h-1.5 bg-[#F3C638] rounded-full" />
            <span>메뉴 보기</span>
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          <a
            href="#menu"
            className="px-3.5 py-1.5 bg-[#111C2D] text-[#F2ECDD] text-xs font-semibold tracking-wide hover:bg-[#E43D30] transition-colors"
          >
            메뉴 보기
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="p-2 text-[#111C2D] hover:text-[#E43D30] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#E43D30]"
          >
            {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden bg-[#F2ECDD] border-b border-[#111C2D]/20 px-6 py-6 transition-all animate-fadeIn"
        >
          <nav className="flex flex-col space-y-4" aria-label="모바일 내비게이션">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold tracking-widest text-[#111C2D] hover:text-[#E43D30] py-2 border-b border-[#111C2D]/10 flex items-center justify-between"
              >
                <span>{link.name}</span>
                <span className="text-xs text-[#111C2D]/40 font-mono">→</span>
              </a>
            ))}
            <div className="pt-2">
              <a
                href="#menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-[#111C2D] text-[#F2ECDD] text-center text-sm font-semibold tracking-wider block hover:bg-[#E43D30] transition-colors"
              >
                메뉴 보기
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
