import React from 'react';

export function BauhausCircle({
  size = 48,
  color = '#E43D30',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`inline-block shrink-0 transition-transform duration-300 ${className}`}
    >
      <circle cx="50" cy="50" r="50" fill={color} />
    </svg>
  );
}

export function BauhausSemiCircle({
  width = 64,
  height = 32,
  color = '#2447C6',
  className = '',
  orientation = 'top',
}: {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  orientation?: 'top' | 'bottom' | 'left' | 'right';
}) {
  let path = 'M 0,50 A 50,50 0 0,1 100,50 Z';
  if (orientation === 'bottom') path = 'M 0,0 A 50,50 0 0,0 100,0 Z';
  if (orientation === 'left') path = 'M 50,0 A 50,50 0 0,0 50,100 Z';
  if (orientation === 'right') path = 'M 0,0 A 50,50 0 0,1 0,100 Z';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 50"
      aria-hidden="true"
      className={`inline-block shrink-0 transition-transform duration-300 ${className}`}
    >
      <path d={path} fill={color} />
    </svg>
  );
}

export function BauhausGridBlock({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`grid grid-cols-3 gap-1.5 w-12 h-12 shrink-0 ${className}`}
    >
      <div className="bg-[#E43D30]" />
      <div className="bg-[#111C2D]" />
      <div className="bg-[#F3C638] rounded-tr-full" />
      <div className="bg-[#111C2D] rounded-bl-full" />
      <div className="bg-[#2447C6]" />
      <div className="bg-[#111C2D]" />
      <div className="bg-[#F2ECDD] border border-[#111C2D]" />
      <div className="bg-[#E43D30] rounded-br-full" />
      <div className="bg-[#111C2D]" />
    </div>
  );
}
