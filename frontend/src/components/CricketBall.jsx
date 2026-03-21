import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import confetti from 'canvas-confetti';

const CricketBall = ({ ball }) => {
  const ballRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    // 1. Highlight Entrance (Large size)
    tl.fromTo(ballRef.current, 
      { 
        scale: 0.01, 
        opacity: 0, 
        y: -300,
        zIndex: 1000 // Ensure it's on top during highlight
      },
      { 
        scale: 0.8, // Big highlight size
        opacity: 1, 
        y: 0, 
        duration: 1.2, 
        ease: "bounce.out",
        onComplete: () => {
          // Trigger Confetti localized to this ball's position
          const rect = ballRef.current.getBoundingClientRect();
          confetti({
            particleCount: 50,
            spread: 70,
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

    // 2. Shrink to Wall Size (After 2 seconds of fame)
    tl.to(ballRef.current, {
      scale: ball.finalScale || 0.2,
      duration: 1.5,
      delay: 2,
      ease: "power2.inOut",
      onStart: () => {
        // Drop z-index as it joins the wall
        gsap.set(ballRef.current, { zIndex: 1 });
      }
    });

    // 3. Persistent Idle Float
    tl.to(ballRef.current, {
      y: "+=10",
      rotation: "+=8",
      duration: 3 + Math.random() * 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, { scope: ballRef });

  return (
    <div 
      ref={ballRef}
      className="absolute cursor-pointer select-none"
      style={{
        left: `${ball.x}%`,
        top: `${ball.y}%`,
        width: '400px', // Increased base size
        transform: `translate(-50%, -50%) rotate(${ball.rotation}deg)`,
      }}
    >
      <img 
        src={ball.imageUrl || '/assets/ball.png'} 
        alt="Cricket Ball" 
        className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] filter brightness-110"
      />
    </div>
  );
};

export default CricketBall;
