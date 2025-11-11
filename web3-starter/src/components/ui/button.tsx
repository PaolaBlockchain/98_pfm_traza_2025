'use client';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps & { href?: undefined };
type ButtonAsLink = AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps & { href: string };

type Props = ButtonAsButton | ButtonAsLink;

const sizeStyles: Record<Size, string> = {
  md: 'px-5 py-3',
  sm: 'px-4 py-2.5 text-[0.6rem] tracking-[0.32em] uppercase',
};

const variantStyles: Record<Variant, string> = {
  primary:
    'border-gray-300 bg-white/90 text-gray-600 hover:border-gray-400 hover:text-gray-700 focus-visible:outline-gray-400',
  secondary:
    'border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:text-gray-700 focus-visible:outline-gray-300',
  ghost:
    'border-gray-200/60 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-700 focus-visible:outline-gray-300',
};

function isLink(props: Props): props is ButtonAsLink {
  return typeof (props as ButtonAsLink).href === 'string';
}

export function Button(props: Props) {
  const { variant = 'primary', size = 'md', className = '', children } = props;
  const base =
    'inline-flex items-center gap-2 rounded-lg border font-mono text-[0.65rem] uppercase tracking-[0.35em] text-gray-600 transition-all duration-300 hover:-translate-y-[1px] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-1';
  const classNames = `${base} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (isLink(props)) {
    const { href, ...anchorProps } = props;
    return (
      <a {...anchorProps} href={href} className={classNames}>
        {children}
      </a>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button {...buttonProps} className={classNames}>
      {children}
    </button>
  );
}
