'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type SplitFlapSize = 'sm' | 'md' | 'lg' | 'hero';

interface SingleFlapProps {
  char: string;
  prevChar?: string;
  size?: SplitFlapSize;
  isFlipping?: boolean;
}

const CHAR_SET = ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.-+%₹:';

// Helper for Web Audio API mechanical flap click
function playMechanicalTick() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Short mechanical snap click
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.025);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // Audio contexts might be blocked until user gesture, ignore silently
  }
}

/**
 * Renders a single Solari split-flap character unit with 3D top/bottom half flip
 */
export function SplitFlapDigit({
  char,
  prevChar = ' ',
  size = 'hero',
  isFlipping = false,
}: SingleFlapProps) {
  const [displayTop, setDisplayTop] = React.useState(char);
  const [displayBottom, setDisplayBottom] = React.useState(char);
  const [flipperTop, setFlipperTop] = React.useState(prevChar);
  const [flipperBottom, setFlipperBottom] = React.useState(char);
  const [animating, setAnimating] = React.useState(false);
  const prevCharRef = React.useRef(char);

  // When char changes, trigger the 3D flip lifecycle
  React.useEffect(() => {
    if (char === prevCharRef.current) return;

    const oldChar = prevCharRef.current;
    prevCharRef.current = char;

    setFlipperTop(oldChar);
    setFlipperBottom(char);
    setDisplayTop(char);
    setAnimating(true);

    const timer = setTimeout(() => {
      setDisplayBottom(char);
      setAnimating(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [char]);

  // Size dimensions
  const sizeStyles = {
    hero: {
      container: 'w-10 sm:w-14 md:w-16 h-16 sm:h-20 md:h-24 text-3xl sm:text-4xl md:text-5xl',
      topHeight: 'h-8 sm:h-10 md:h-12',
      bottomHeight: 'h-8 sm:h-10 md:h-12',
      fontSize: 'text-3xl sm:text-4xl md:text-5xl',
      lineHeight: 'leading-[64px] sm:leading-[80px] md:leading-[96px]',
      seamHeight: 'h-[2px]',
    },
    lg: {
      container: 'w-9 sm:w-11 h-14 sm:h-16 text-2xl sm:text-3xl',
      topHeight: 'h-7 sm:h-8',
      bottomHeight: 'h-7 sm:h-8',
      fontSize: 'text-2xl sm:text-3xl',
      lineHeight: 'leading-[56px] sm:leading-[64px]',
      seamHeight: 'h-[2px]',
    },
    md: {
      container: 'w-7 sm:w-8 h-10 sm:h-12 text-lg sm:text-xl',
      topHeight: 'h-5 sm:h-6',
      bottomHeight: 'h-5 sm:h-6',
      fontSize: 'text-lg sm:text-xl',
      lineHeight: 'leading-[40px] sm:leading-[48px]',
      seamHeight: 'h-[1.5px]',
    },
    sm: {
      container: 'w-5 sm:w-6 h-8 sm:h-9 text-xs sm:text-sm',
      topHeight: 'h-4 sm:h-4.5',
      bottomHeight: 'h-4 sm:h-4.5',
      fontSize: 'text-xs sm:text-sm',
      lineHeight: 'leading-[32px] sm:leading-[36px]',
      seamHeight: 'h-[1px]',
    },
  };

  const currentSize = sizeStyles[size];

  // Special compact width for punctuation
  const isCompact = char === '.' || char === ':' || char === ' ';
  const widthOverride = isCompact
    ? size === 'hero'
      ? 'w-4 sm:w-6'
      : size === 'lg'
      ? 'w-4 sm:w-5'
      : 'w-3'
    : '';

  return (
    <div
      className={cn(
        'flap-container shrink-0 relative bg-[#0B0F17] rounded shadow-[0_2px_8px_rgba(0,0,0,0.6)] select-none border border-[#232F46]/80',
        currentSize.container,
        widthOverride
      )}
    >
      {/* Mechanical Side Hinges */}
      <div className="flap-hinge-left" />
      <div className="flap-hinge-right" />

      {/* 1. Static Upper Flap (shows next char top half) */}
      <div
        className={cn(
          'flap-half flap-top absolute top-0 left-0 right-0 w-full overflow-hidden text-primary font-mono',
          currentSize.topHeight
        )}
      >
        <span
          className={cn(
            'absolute top-0 w-full text-center font-bold tracking-tight',
            currentSize.fontSize,
            currentSize.lineHeight
          )}
        >
          {displayTop}
        </span>
      </div>

      {/* 2. Static Lower Flap (shows current char bottom half) */}
      <div
        className={cn(
          'flap-half flap-bottom absolute bottom-0 left-0 right-0 w-full overflow-hidden text-primary font-mono',
          currentSize.bottomHeight
        )}
      >
        <span
          className={cn(
            'absolute bottom-0 w-full text-center font-bold tracking-tight',
            currentSize.fontSize,
            currentSize.lineHeight
          )}
        >
          {displayBottom}
        </span>
      </div>

      {/* 3. Animated Top Flipper (flips down from 0 to -90 deg) */}
      {animating && (
        <div
          className={cn(
            'flap-half flap-top absolute top-0 left-0 right-0 w-full overflow-hidden z-20 text-primary font-mono origin-bottom transition-transform duration-150 ease-in',
            currentSize.topHeight
          )}
          style={{
            transform: 'rotateX(-90deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          <span
            className={cn(
              'absolute top-0 w-full text-center font-bold tracking-tight',
              currentSize.fontSize,
              currentSize.lineHeight
            )}
          >
            {flipperTop}
          </span>
        </div>
      )}

      {/* 4. Animated Bottom Flipper (flips from 90 to 0 deg) */}
      {animating && (
        <div
          className={cn(
            'flap-half flap-bottom absolute bottom-0 left-0 right-0 w-full overflow-hidden z-20 text-primary font-mono origin-top animate-flip-bottom',
            currentSize.bottomHeight
          )}
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          <span
            className={cn(
              'absolute bottom-0 w-full text-center font-bold tracking-tight',
              currentSize.fontSize,
              currentSize.lineHeight
            )}
          >
            {flipperBottom}
          </span>
        </div>
      )}

      {/* Center Split Seam */}
      <div className="flap-seam" />
    </div>
  );
}

export interface SplitFlapDisplayProps {
  value: string | number;
  label?: string;
  sublabel?: string;
  size?: SplitFlapSize;
  minLength?: number;
  enableAudio?: boolean;
  staggerMs?: number;
  cycleSteps?: number; // Number of intermediate mechanical steps per flip
  className?: string;
}

/**
 * SplitFlapDisplay: The signature Solari / Airport Departure Board numeral display.
 * Handles strings, numbers, decimals, and staggered multi-digit mechanical transitions.
 */
export function SplitFlapDisplay({
  value,
  label,
  sublabel,
  size = 'hero',
  minLength = 0,
  enableAudio = false,
  staggerMs = 45,
  cycleSteps = 3,
  className,
}: SplitFlapDisplayProps) {
  const targetStr = String(value ?? '').toUpperCase().padStart(minLength, ' ');
  const [currentChars, setCurrentChars] = React.useState<string[]>(
    () => targetStr.split('')
  );
  const [prevChars, setPrevChars] = React.useState<string[]>(
    () => targetStr.split('')
  );
  const isFirstRender = React.useRef(true);
  const timersRef = React.useRef<NodeJS.Timeout[]>([]);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const targetArray = targetStr.split('');
    setCurrentChars((prev) => {
      const paddedCurrent = [...prev];
      while (paddedCurrent.length < targetArray.length) {
        paddedCurrent.unshift(' ');
      }
      setPrevChars([...paddedCurrent]);

      // Animate each column with staggered stepping
      targetArray.forEach((targetChar, index) => {
        const fromChar = paddedCurrent[index] || ' ';
        if (fromChar === targetChar) return;

        const delay = index * staggerMs;

        // Intermediate cycling steps for authentic airport Solari effect
        for (let step = 1; step <= cycleSteps; step++) {
          const t = setTimeout(() => {
            if (step === cycleSteps) {
              setCurrentChars((c) => {
                const next = [...c];
                next[index] = targetChar;
                return next;
              });
              if (enableAudio) {
                playMechanicalTick();
              }
            } else {
              // Pick a rolling intermediate character
              const fromIndex = CHAR_SET.indexOf(fromChar);
              const intermediate =
                CHAR_SET[(fromIndex + step * 3) % CHAR_SET.length];
              setCurrentChars((c) => {
                const next = [...c];
                next[index] = intermediate;
                return next;
              });
              if (enableAudio && step === 1) {
                playMechanicalTick();
              }
            }
          }, delay + step * 50);

          timersRef.current.push(t);
        }
      });

      return paddedCurrent;
    });

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [targetStr, staggerMs, cycleSteps, enableAudio]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between font-mono text-xs">
          {label && (
            <span className="text-secondary tracking-wider uppercase font-semibold">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-secondary-muted">{sublabel}</span>
          )}
        </div>
      )}

      {/* Flap Units Row */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 p-2 sm:p-3 md:p-4 bg-[#090D15] rounded-md border border-border-subtle shadow-panel-elevated overflow-x-auto">
        {currentChars.map((ch, idx) => (
          <SplitFlapDigit
            key={`flap-${idx}`}
            char={ch}
            prevChar={prevChars[idx] || ' '}
            size={size}
          />
        ))}
      </div>
    </div>
  );
}
