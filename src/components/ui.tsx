'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Natural sort: "Gynae-P1" < "Gynae-P2" < "Gynae-P10". */
export function naturalCompare(a: string, b: string): number {
  const ax: (string | number)[] = [];
  const bx: (string | number)[] = [];
  a.replace(/(\d+)|(\D+)/g, (_, d, s) => (ax.push(d ? Number(d) : s), ''));
  b.replace(/(\d+)|(\D+)/g, (_, d, s) => (bx.push(d ? Number(d) : s), ''));
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const av = ax[i];
    const bv = bx[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av) > String(bv) ? 1 : -1;
  }
  return 0;
}

export function Pill({
  children,
  onClick,
  active,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors';
  const look = active
    ? 'border-accent bg-accent text-white'
    : 'border-line bg-card/60 text-muted hover:text-ink hover:border-accent/60';
  const interactive = onClick ? 'cursor-pointer' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${base} ${look} ${interactive} ${className} disabled:cursor-default`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost';
};

export function Button({ variant = 'solid', className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-default';
  const look =
    variant === 'solid'
      ? 'bg-accent text-white shadow-sm hover:brightness-110 active:brightness-95'
      : 'border border-line bg-transparent text-ink hover:border-accent/60 hover:text-accent';
  return <button className={`${base} ${look} ${className}`} {...props} />;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}
