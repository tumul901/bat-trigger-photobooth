import React, { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
 
const CricketBall = ({ ball, onRemove }) => {
  const ballRef = useRef(null);
  const outerRef = useRef(null);
 
  useGSAP(() => {
    if (!ballRef.current) return;
 
    const tl = gsap.timeline();
 
    // Step 1: Entrance pop — medium and smooth
    tl.fromTo(ballRef.current,
      { scale: 0.01, opacity: 0, y: -200 },
      {
        scale: 4.0,
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "bounce.out",
        onComplete: () => {
          const rect = ballRef.current?.getBoundingClientRect();
          if (!rect) return;
          confetti({
            particleCount: 40,
            spread: 60,
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight
            },
            colors: ['#d41e2d', '#ffffff', '#ffd700'],
            zIndex: 1100
          });
        }
      }
    );
 
    // Step 2: Settle back to wall size (scale 1.0 = CSS layer handles actual size)
    tl.to(ballRef.current, {
      scale: 1.0,
      duration: 1.5,
      delay: 2.0,
      ease: "power2.inOut",
    });
 
    // Step 3: Idle float — forever
    gsap.to(ballRef.current, {
      y: "+=12",
      rotation: "+=10",
      duration: 3 + Math.random() * 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 4.0
    });
 
  }, []); // Empty deps: GSAP runs once, never interrupted
 
  // When ball is marked for removal, fade out the OUTER container,
  // then call onRemove to delete it from state after 1s
  useEffect(() => {
    if (!ball.removing || !outerRef.current) return;
 
    gsap.to(outerRef.current, {
      opacity: 0,
      scale: 0.5,
      duration: 1.0,
      ease: "power2.in",
      onComplete: () => onRemove?.(ball.id),
    });
  }, [ball.removing]);
 
  const baseSize = ball.finalScale || 0.2;
  const frozenScale = `scale(calc(${baseSize} * ${ball.birthMultiplier ?? 1}))`;
 
  return (
    // outerRef: GSAP fades this out on removal — completely separate from ballRef
    <div
      ref={outerRef}
      className="absolute select-none pointer-events-none"
      style={{
        left: `${ball.x}%`,
        top: `${ball.y}%`,
        width: 'clamp(400px, 20vw, 800px)',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
      }}
    >
      {/* Layer 2: CSS Scaling — frozen at birth, never changes */}
      <div
        className="w-full h-full"
        style={{
          transform: frozenScale,
          transformOrigin: 'center',
          transition: 'transform 0.7s ease-out',
        }}
      >
        {/* Layer 3: GSAP owns opacity + scale on this element only */}
        <div
          ref={ballRef}
          className="w-full h-full cursor-pointer pointer-events-auto origin-center"
        >
          <img
            src={ball.imageUrl || '/assets/ball.png'}
            alt="Cricket Ball"
            className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] filter brightness-110"
          />
        </div>
      </div>
    </div>
  );
};
 
export default CricketBall;