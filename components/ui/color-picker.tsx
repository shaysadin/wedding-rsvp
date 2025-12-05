'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number; a: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle alpha
  let a = 1;
  if (hex.length === 8) {
    a = parseInt(hex.slice(6, 8), 16) / 255;
    hex = hex.slice(0, 6);
  }

  // Parse RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100, a };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number, a: number = 1): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (a < 1) {
    const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
    return hex + alphaHex;
  }

  return hex;
}

// Normalize hex input
function normalizeHex(input: string): string | null {
  let hex = input.replace(/^#/, '').toLowerCase();

  // Handle short hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Validate
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) {
    return null;
  }

  return '#' + hex;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [hsl, setHsl] = useState(() => hexToHsl(value || '#000000'));
  const [hexInput, setHexInput] = useState(value || '#000000');
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [isDraggingAlpha, setIsDraggingAlpha] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);

  // Sync from external value changes
  useEffect(() => {
    if (value) {
      const normalized = normalizeHex(value);
      if (normalized) {
        const newHsl = hexToHsl(normalized);
        setHsl(newHsl);
        setHexInput(normalized.slice(0, 7)); // Only show 6-char hex
      }
    }
  }, [value]);

  // Emit changes
  const emitChange = useCallback((h: number, s: number, l: number, a: number) => {
    const hex = hslToHex(h, s, l, a);
    setHexInput(hex.slice(0, 7));
    onChange(hex);
  }, [onChange]);

  // Board (Saturation + Lightness) handling
  const handleBoardMove = useCallback((clientX: number, clientY: number) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    // Convert x,y to saturation and lightness
    // x = saturation (0-100), y = brightness (inverted for lightness)
    const s = x * 100;
    const l = (1 - y) * (100 - s / 2); // Approximate conversion

    setHsl(prev => ({ ...prev, s, l }));
    emitChange(hsl.h, s, l, hsl.a);
  }, [hsl.h, hsl.a, emitChange]);

  // Hue slider handling
  const handleHueMove = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const h = x * 360;

    setHsl(prev => ({ ...prev, h }));
    emitChange(h, hsl.s, hsl.l, hsl.a);
  }, [hsl.s, hsl.l, hsl.a, emitChange]);

  // Alpha slider handling
  const handleAlphaMove = useCallback((clientX: number) => {
    if (!alphaRef.current) return;
    const rect = alphaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const a = x;

    setHsl(prev => ({ ...prev, a }));
    emitChange(hsl.h, hsl.s, hsl.l, a);
  }, [hsl.h, hsl.s, hsl.l, emitChange]);

  // Global mouse move/up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingBoard) {
        handleBoardMove(e.clientX, e.clientY);
      } else if (isDraggingHue) {
        handleHueMove(e.clientX);
      } else if (isDraggingAlpha) {
        handleAlphaMove(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingBoard(false);
      setIsDraggingHue(false);
      setIsDraggingAlpha(false);
    };

    if (isDraggingBoard || isDraggingHue || isDraggingAlpha) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBoard, isDraggingHue, isDraggingAlpha, handleBoardMove, handleHueMove, handleAlphaMove]);

  // Handle hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setHexInput(input);

    const normalized = normalizeHex(input);
    if (normalized) {
      const newHsl = hexToHsl(normalized);
      setHsl(newHsl);
      onChange(normalized);
    }
  };

  // Calculate board cursor position
  const boardX = hsl.s / 100;
  const boardY = 1 - (hsl.l / (100 - hsl.s / 2));

  // Clamp boardY
  const clampedBoardY = Math.max(0, Math.min(1, isNaN(boardY) ? 0 : boardY));

  return (
    <div className={cn('flex flex-col gap-3 p-3', className)}>
      {/* Color Board (Saturation/Lightness) */}
      <div
        ref={boardRef}
        className="relative h-40 w-full cursor-crosshair rounded-lg overflow-hidden"
        style={{
          background: `
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent),
            hsl(${hsl.h}, 100%, 50%)
          `,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingBoard(true);
          handleBoardMove(e.clientX, e.clientY);
        }}
      >
        {/* Cursor */}
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${boardX * 100}%`,
            top: `${clampedBoardY * 100}%`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Hue Slider */}
      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer rounded-full"
        style={{
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingHue(true);
          handleHueMove(e.clientX);
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white"
          style={{
            left: `${(hsl.h / 360) * 100}%`,
            boxShadow: '0 0 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Alpha Slider */}
      <div
        ref={alphaRef}
        className="relative h-3 w-full cursor-pointer rounded-full overflow-hidden"
        style={{
          background: `
            linear-gradient(to right, transparent, hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)),
            repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px
          `,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingAlpha(true);
          handleAlphaMove(e.clientX);
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white"
          style={{
            left: `${hsl.a * 100}%`,
            boxShadow: '0 0 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* Hex Input */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-md border border-gray-200 flex-shrink-0"
          style={{
            backgroundColor: hslToHex(hsl.h, hsl.s, hsl.l, 1),
          }}
        />
        <Input
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          placeholder="#000000"
          className="h-8 font-mono text-sm"
          maxLength={9}
        />
        {hsl.a < 1 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {Math.round(hsl.a * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
