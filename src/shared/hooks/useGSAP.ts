'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useGSAPAnimation(options?: {
  enter?: gsap.TweenVars;
  exit?: gsap.TweenVars;
  trigger?: string;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const defaultEnter = {
      opacity: 0,
      y: 20,
      duration: 0.4,
      ease: 'power2.out',
    };

    gsap.fromTo(element, defaultEnter, {
      opacity: 1,
      y: 0,
      ...options?.enter,
    });

    return () => {
      if (options?.exit) {
        gsap.to(element, {
          ...options.exit,
        });
      }
    };
  }, [options?.enter, options?.exit]);

  return elementRef;
}

export function animateStagger(items: HTMLElement[], options?: gsap.TweenVars) {
  gsap.fromTo(items, 
    { opacity: 0, y: 20 },
    { 
      opacity: 1, 
      y: 0, 
      duration: 0.3, 
      stagger: 0.1,
      ease: 'power2.out',
      ...options 
    }
  );
}

export function fadeIn(element: HTMLElement, options?: gsap.TweenVars) {
  gsap.fromTo(element, 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.3, ease: 'power2.out', ...options }
  );
}

export function fadeOut(element: HTMLElement, options?: gsap.TweenVars) {
  gsap.to(element, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
    ...options
  });
}

export function scaleIn(element: HTMLElement, options?: gsap.TweenVars) {
  gsap.fromTo(element,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(1.2)', ...options }
  );
}

export function slideIn(element: HTMLElement, direction: 'left' | 'right' | 'up' | 'down', options?: gsap.TweenVars) {
  const transforms = {
    left: { x: -50, y: 0 },
    right: { x: 50, y: 0 },
    up: { x: 0, y: -50 },
    down: { x: 0, y: 50 },
  };

  gsap.fromTo(element,
    { opacity: 0, ...transforms[direction] },
    { opacity: 1, x: 0, y: 0, duration: 0.3, ease: 'power2.out', ...options }
  );
}