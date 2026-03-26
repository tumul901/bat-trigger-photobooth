import { useState, useEffect } from 'react';

const VITE_WS_URL = import.meta.env.VITE_WS_URL || `ws://127.0.0.1:8080`;

// Sitting size formula:
// - We keep balls at a steady, large size (1.3x) 
// - Instead of shrinking, we rely on removing older balls (MAX_BALLS)
const getMultiplier = (count) => {
  return 1.3; 
};

// Pre-computed 16-slot grid (widened columns for scale 0.37 balls)
// Note: Top-right quadrant (x > 52, y < 25) is kept empty for the logo
const SLOTS = [
  { x: 30, y: 44 }, { x: 74, y: 44 }, { x: 8, y: 44 },  { x: 52, y: 44 }, // Mid-height
  { x: 30, y: 68 }, { x: 74, y: 68 }, { x: 8, y: 68 },  { x: 52, y: 68 }, // Bottom-mid
  { x: 8, y: 20 },  { x: 30, y: 20 }, { x: 52, y: 20 },                  // Top row (Logo-safe)
  { x: 8, y: 88 },  { x: 30, y: 88 }, { x: 74, y: 88 }, { x: 52, y: 88 }, { x: 92, y: 88 } // Bottom row 
];

// Nudge calculation with bounds limit (amount 6 = +/- 6% for safe breathing room)
const applyJitter = (x, y) => {
  const amount = 6;
  let jX = x + (Math.random() * amount * 2 - amount);
  let jY = y + (Math.random() * amount * 2 - amount);
  
  // Basic screen edge safety
  jX = Math.max(8, Math.min(92, jX));
  jY = Math.max(12, Math.min(88, jY));

  // Logo Safe-Zone Clamp: top-right corner (approx x > 55, y < 25)
  if (jX > 55 && jY < 25) {
    jY = 25;
  }
  
  return { jX, jY };
};

// Max balls allowed on wall before the oldest is removed
const MAX_BALLS = 15;

export function usePhotoWall() {
  const [balls, setBalls] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let socket;
    let reconnectTimer;

    const connect = () => {
      console.log(`DEBUG: Connecting to WebSocket at ${VITE_WS_URL}/ws`);
      socket = new WebSocket(`${VITE_WS_URL}/ws`);

      socket.onopen = () => {
        console.log("DEBUG: WebSocket Connected");
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "new_ball") {
          setBalls(prev => {
            if (prev.find(b => b.id === msg.ball.id)) return prev;

            // Find first available slot
            const usedSlotIds = prev.map(b => b.slotId);
            const slotIndex = SLOTS.findIndex((_, idx) => !usedSlotIds.includes(idx));
            const finalSlotIndex = slotIndex === -1 ? 0 : slotIndex; // Fallback to 0 if all full

            const birthMultiplier = getMultiplier(prev.length + 1);
            const { jX, jY } = applyJitter(SLOTS[finalSlotIndex].x, SLOTS[finalSlotIndex].y);

            let newBalls = [...prev, { 
                ...msg.ball, 
                birthMultiplier,
                x: jX,
                y: jY,
                slotId: finalSlotIndex
            }];

            if (newBalls.length > MAX_BALLS) {
              newBalls[0] = { ...newBalls[0], removing: true };
            }

            return newBalls;
          });
        }
      };

      socket.onclose = () => {
        console.log("DEBUG: WebSocket Disconnected. Retrying in 3s...");
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error("DEBUG: WebSocket Error:", err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const addTestBall = () => {
    setBalls(prev => {
      // Find first available slot
      const usedSlotIds = prev.map(b => b.slotId);
      const slotIndex = SLOTS.findIndex((_, idx) => !usedSlotIds.includes(idx));
      const finalSlotIndex = slotIndex === -1 ? 0 : slotIndex;

      const birthMultiplier = getMultiplier(prev.length + 1);
      const { jX, jY } = applyJitter(SLOTS[finalSlotIndex].x, SLOTS[finalSlotIndex].y);

      const newBall = {
        id: Date.now(),
        imageUrl: "/assets/ball.png",
        x: jX,
        y: jY,
        slotId: finalSlotIndex,
        finalScale: 0.37,
        rotation: Math.random() * 360,
        birthMultiplier,
      };

      let newBalls = [...prev, newBall];

      if (newBalls.length > MAX_BALLS) {
        newBalls[0] = { ...newBalls[0], removing: true };
      }

      return newBalls;
    });
  };

  // Called by CricketBall after its fade-out animation completes
  const removeBall = (id) => {
    setBalls(prev => prev.filter(b => b.id !== id));
  };

  return { balls, isConnected, addTestBall, removeBall };
}