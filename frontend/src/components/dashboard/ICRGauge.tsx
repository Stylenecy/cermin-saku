"use client";

import { useEffect, useState } from "react";
import { icrToColor, icrLabel } from "@/lib/utils";

interface ICRGaugeProps {
  icr: bigint;
  dark?: boolean;
}

const RADIUS = 54;
const STROKE = 8;
const CENTER = 70;
const SWEEP_DEG = 240;
const START_DEG = 150;
const MIN_BPS = 10_000;
const MAX_BPS = 30_000;

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function icrToFraction(icrBps: number): number {
  const clamped = Math.max(MIN_BPS, Math.min(MAX_BPS, icrBps));
  return (clamped - MIN_BPS) / (MAX_BPS - MIN_BPS);
}

export function ICRGauge({ icr, dark = false }: ICRGaugeProps) {
  const icrBps = Number(icr);
  const icrPct = icrBps / 100;
  const fraction = icrToFraction(icrBps);
  const strokeColor = icrToColor(icrBps);

  // Draw the fill arc on mount (and whenever the value changes) by easing the
  // normalized dash offset from fully hidden to its target.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [fraction]);

  const trackStart = START_DEG;
  const trackEnd = START_DEG + SWEEP_DEG;
  const fillEnd = START_DEG + SWEEP_DEG * fraction;
  const trackPath = arcPath(CENTER, CENTER, RADIUS, trackStart, trackEnd);
  const fillPath =
    fraction > 0 ? arcPath(CENTER, CENTER, RADIUS, trackStart, fillEnd) : null;
  const label = icrLabel(icrBps);

  return (
    <div className="flex flex-col items-center">
      <svg width={140} height={140} viewBox="0 0 140 140">
        <path
          d={trackPath}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.14)" : "#EDE4D5"}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{
              filter: `drop-shadow(0 0 4px ${strokeColor}40)`,
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          />
        )}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          fill={dark ? "#FDFBF7" : "#1F1B17"}
          fontSize="18"
          fontWeight="700"
          fontFamily="inherit"
        >
          {icrPct.toFixed(0)}%
        </text>
        <text
          x={CENTER}
          y={CENTER + 12}
          textAnchor="middle"
          fill={strokeColor}
          fontSize="10"
          fontWeight="500"
          fontFamily="inherit"
        >
          {label}
        </text>
        <text
          x={CENTER}
          y={CENTER + 26}
          textAnchor="middle"
          fill={dark ? "rgba(255,255,255,0.45)" : "#8A8278"}
          fontSize="9"
          fontFamily="inherit"
        >
          ICR
        </text>
      </svg>
    </div>
  );
}
