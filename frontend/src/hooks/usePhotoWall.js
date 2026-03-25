import { useState, useEffect } from 'react';

const VITE_WS_URL = import.meta.env.VITE_WS_URL || `ws://127.0.0.1:8080`;

// Sitting size formula:
// - We keep balls at a steady, large size (1.3x) 
// - Instead of shrinking, we rely on removing older balls (MAX_BALLS)
const getMultiplier = (count) => {
  return 1.3; 
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

            const birthMultiplier = getMultiplier(prev.length + 1);
            let newBalls = [...prev, { ...msg.ball, birthMultiplier }];

            // If we've hit the cap, mark the oldest ball as removing
            // It will fade out in CricketBall.jsx, then be removed after 1s
            if (newBalls.length > MAX_BALLS) {
              newBalls[0] = { ...newBalls[0], removing: true };
            }

            return newBalls;
          });
        } else if (msg.type === "swing_detected") {
          console.log("DEBUG: Swing detected via WebSocket!");
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
      let x, y, tooClose;
      let attempts = 0;

      do {
        x = 15 + Math.random() * 70;
        y = 20 + Math.random() * 55;
        tooClose = prev.some(b => Math.abs(b.x - x) < 10 && Math.abs(b.y - y) < 15);
        attempts++;
      } while (tooClose && attempts < 15);

      const birthMultiplier = getMultiplier(prev.length + 1);

      const newBall = {
        id: Date.now(),
        imageUrl: "/assets/ball.png",
        x,
        y,
        finalScale: 0.22 + Math.random() * 0.08,
        rotation: Math.random() * 360,
        birthMultiplier,
      };

      let newBalls = [...prev, newBall];

      // If we've hit the cap, mark the oldest ball as removing
      // CricketBall.jsx fades it out, then calls onRemove to delete it after 1s
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