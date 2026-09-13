/**
 * The 3D cap from the prototype, ported as-is: a sliced CSS cylinder. Thirty thin faces carry a band of the
 * side photo, the top face is the cutout, a fixed highlight band sits over the texture and the texture turns
 * under it. Drag = yaw with inertia (decay 0.94/frame), vertical drag = tilt clamped ±35°, double-tap resets.
 * No overlay or filter ever touches the top-face photo.
 */
import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { Box } from '../cutout/types';
import { useReducedMotion } from '../lib/reducedMotion';
import styles from './Cap3D.module.css';

export interface CapTexture {
  url: string;
  /** Size of the image at `url`, and where the cap is inside it. null = use the whole image. */
  width: number;
  height: number;
  bbox: Box | null;
}

interface Props {
  top: CapTexture;
  side?: CapTexture | null;
  /** Side colour when there is no side photo. */
  sideColor?: string | null;
  radius: number;
  interactive?: boolean;
  auto?: boolean;
  autoSpeed?: number;
}

const SLICES = 30;
const TILT_REST = -22;
const TILT_MAX = 35;
const DECAY = 0.94;
const DOUBLE_TAP_MS = 300;

interface Motion {
  yaw: number;
  tilt: number;
  vel: number;
  dragging: boolean;
  lastTap: number;
  px: number;
  sy: number;
  t0: number;
  d: number;
}

function centered(w: number, h: number): CSSProperties {
  return { position: 'absolute', left: '50%', top: '50%', width: w, height: h, margin: `${-h / 2}px 0 0 ${-w / 2}px` };
}

/** Background rules that put the cap's bounding box exactly on a 2R disc. */
function topFace(top: CapTexture, R: number): CSSProperties {
  if (!top.bbox) return { backgroundImage: `url(${top.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  const s = (2 * R) / Math.max(top.bbox.w, top.bbox.h);
  const left = R - (top.bbox.x + top.bbox.w / 2) * s;
  const topPx = R - (top.bbox.y + top.bbox.h / 2) * s;
  return {
    backgroundImage: `url(${top.url})`,
    backgroundSize: `${top.width * s}px ${top.height * s}px`,
    backgroundPosition: `${left}px ${topPx}px`,
  };
}

/** The strip of the side photo wrapped around the cylinder, as fractions of the image. */
function sideBand(side: CapTexture) {
  if (!side.bbox) return { x: 0.12, w: 0.7, y: 0.68, h: 0.2 };
  const b = side.bbox;
  return {
    x: (b.x + 0.05 * b.w) / side.width,
    w: (0.9 * b.w) / side.width,
    y: (b.y + 0.62 * b.h) / side.height,
    h: (0.2 * b.h) / side.height,
  };
}

export function Cap3D({ top, side, sideColor, radius: R, interactive = false, auto = false, autoSpeed = 0.4 }: Props) {
  const reduced = useReducedMotion();
  const motion = useRef<Motion>({ yaw: 0, tilt: TILT_REST, vel: 0, dragging: false, lastTap: 0, px: 0, sy: 0, t0: TILT_REST, d: 0 });
  const yawNode = useRef<HTMLDivElement>(null);
  const tiltNode = useRef<HTMLDivElement>(null);
  const shadowNode = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const spinning = auto && !reduced;

  const apply = () => {
    const m = motion.current;
    if (tiltNode.current) tiltNode.current.style.transform = `rotateX(${m.tilt}deg)`;
    if (yawNode.current) yawNode.current.style.transform = `rotateY(${m.yaw}deg)`;
    if (shadowNode.current) {
      const s = Math.max(0.6, 0.92 + -m.tilt / 130);
      shadowNode.current.style.transform = `translateX(-50%) scale(${s},1)`;
      shadowNode.current.style.opacity = String(0.3 + Math.min(0.3, Math.abs(m.tilt) / 90));
    }
  };

  // The frame loop only runs while something moves; pointer events wake it.
  const wake = () => {
    if (raf.current) return;
    const tick = () => {
      const m = motion.current;
      if (!m.dragging) {
        m.yaw += m.vel;
        m.vel *= DECAY;
        if (Math.abs(m.vel) < 0.02) m.vel = 0;
        if (spinning) m.yaw += autoSpeed;
      }
      apply();
      raf.current = m.dragging || m.vel !== 0 || spinning ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    apply();
    wake();
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, autoSpeed]);

  const geometry = useMemo(() => {
    const H = Math.round(2 * R * 0.18);
    const w = 2 * R * Math.tan(Math.PI / SLICES) + 0.8;
    const rep = (SLICES * w) / 4;
    const band = side ? sideBand(side) : null;
    const bgW = band ? rep / band.w : 0;
    const bgH = band ? H / band.h : 0;
    const color = sideColor ?? 'var(--color-side-fallback)';
    const faces: CSSProperties[] = [];
    const highlights: CSSProperties[] = [];
    for (let i = 0; i < SLICES; i++) {
      const ang = (i * 360) / SLICES;
      faces.push({
        ...centered(w + 0.6, H),
        transform: `rotateY(${ang}deg) translateZ(${R - 0.3}px)`,
        backgroundColor: color,
        ...(side && band
          ? {
              backgroundImage: `url(${side.url})`,
              backgroundSize: `${bgW}px ${bgH}px`,
              backgroundPosition: `${-(bgW * band.x + ((i * w) % rep))}px ${-(bgH * band.y)}px`,
            }
          : {}),
        backfaceVisibility: 'hidden',
      });
      const rad = ((ang - 28) * Math.PI) / 180;
      const op = Math.pow(Math.max(0, Math.cos(rad)), 3) * 0.38;
      if (op > 0.02) {
        highlights.push({
          ...centered(w + 0.6, H),
          transform: `rotateY(${ang}deg) translateZ(${R + 0.4}px)`,
          background: 'linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,.12))',
          opacity: op,
          backfaceVisibility: 'hidden',
          pointerEvents: 'none',
        });
      }
    }
    return { H, faces, highlights, W: 2 * R + 24, Hw: 2 * R * 0.82 + H + 24 };
  }, [R, side, sideColor]);

  const onPointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    const now = Date.now();
    if (now - m.lastTap < DOUBLE_TAP_MS) {
      m.yaw = 0;
      m.tilt = TILT_REST;
      m.vel = 0;
    }
    m.lastTap = now;
    m.dragging = true;
    m.px = ev.clientX;
    m.sy = ev.clientY;
    m.t0 = m.tilt;
    m.d = 0;
    m.vel = 0;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    wake();
  };
  const onPointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const m = motion.current;
    if (!m.dragging) return;
    const dx = ev.clientX - m.px;
    m.px = ev.clientX;
    m.d = dx;
    m.yaw += dx * 0.55;
    m.tilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, m.t0 + (ev.clientY - m.sy) * 0.35));
  };
  const release = () => {
    const m = motion.current;
    if (!m.dragging) return;
    m.dragging = false;
    m.vel = reduced ? 0 : Math.max(-9, Math.min(9, m.d * 0.55));
    wake();
  };

  const handlers = interactive
    ? { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release, onPointerLeave: release }
    : {};

  return (
    <div
      className={styles.stage}
      style={{ width: geometry.W, height: geometry.Hw, perspective: 8 * R, cursor: interactive ? 'grab' : 'default' }}
      {...handlers}
    >
      <div ref={shadowNode} className={styles.shadow} style={{ width: 1.7 * R, height: 0.34 * R }} />
      <div ref={tiltNode} className={styles.group}>
        <div ref={yawNode} className={styles.group}>
          <div
            className={styles.bottom}
            style={{ ...centered(2 * R, 2 * R), transform: `rotateX(-90deg) translateZ(${geometry.H / 2}px)` }}
          />
          {geometry.faces.map((style, i) => (
            <div key={i} style={style} />
          ))}
          <div
            className={styles.top}
            style={{ ...centered(2 * R, 2 * R), transform: `rotateX(90deg) translateZ(${geometry.H / 2}px)`, ...topFace(top, R) }}
          />
        </div>
        <div className={styles.group} style={{ pointerEvents: 'none' }}>
          {geometry.highlights.map((style, i) => (
            <div key={i} style={style} />
          ))}
        </div>
      </div>
    </div>
  );
}
