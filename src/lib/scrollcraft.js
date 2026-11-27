/**
 * Quidesk ScrollCraft Runtime
 * 
 * High-performance, isolated scroll physics and timeline synchronizer.
 * - Normalized global scroll progress (--sc-p: 0..1)
 * - Per-act normalized progress (--sc-act-[1..5]: 0..1)
 * - requestAnimationFrame with lerp smoothing (0.12 factor)
 * - Strict prefers-reduced-motion handling (zero transforms, freezes rAF)
 * - Transform and opacity only; zero layout thrashing
 */

import { useEffect, useRef } from 'react';

export function initScrollCraft() {
  if (typeof window === 'undefined') return () => {};

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    document.documentElement.style.setProperty('--sc-p', '0');
    for (let i = 1; i <= 5; i++) {
      document.documentElement.style.setProperty(`--sc-act-${i}`, '1');
    }
    return () => {};
  }

  let rafId = null;
  let targetProgress = 0;
  let currentProgress = 0;
  let isRunning = true;

  const actElements = [];
  for (let i = 1; i <= 5; i++) {
    const el = document.querySelector(`[data-sc-act="${i}"]`);
    actElements.push({ index: i, el });
  }

  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      targetProgress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    } else {
      targetProgress = 0;
    }
  }

  function loop() {
    if (!isRunning) return;

    // Smooth lerp for global progress
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0005) {
      currentProgress += diff * 0.12;
    } else {
      currentProgress = targetProgress;
    }

    document.documentElement.style.setProperty('--sc-p', currentProgress.toFixed(4));

    // Calculate per-act progress
    const vh = window.innerHeight;
    actElements.forEach(({ index, el }) => {
      const targetEl = el || document.querySelector(`[data-sc-act="${index}"]`);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        // Progress: 0 when top enters bottom of viewport, 1 when bottom leaves top
        const totalDist = rect.height + vh;
        const traveled = vh - rect.top;
        const actProg = Math.min(Math.max(traveled / totalDist, 0), 1);
        document.documentElement.style.setProperty(`--sc-act-${index}`, actProg.toFixed(4));
      }
    });

    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  loop();

  return () => {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  };
}

export function useScrollCraft() {
  const cleanupRef = useRef(null);

  useEffect(() => {
    cleanupRef.current = initScrollCraft();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);
}
