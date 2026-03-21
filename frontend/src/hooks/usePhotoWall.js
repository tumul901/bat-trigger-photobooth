import { useState, useEffect } from 'react';

const VITE_WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000`;

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
            // Deduplicate: Don't add if ID already exists (fixes double-ball bug)
            if (prev.find(b => b.id === msg.ball.id)) return prev;
            return [...prev, msg.ball];
          });
        } else if (msg.type === "swing_detected") {
          console.log("DEBUG: Swing detected via WebSocket!");
          // Phase 3 note: We'll trigger animations here in Phase 4
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

  // For Phase 3/4 Manual Testing
  const addTestBall = () => {
    let x, y, tooClose;
    let attempts = 0;
    
    // Avoid overlapping: Try to find a spot not too close to others
    do {
      x = 15 + Math.random() * 70;
      y = 20 + Math.random() * 55;
      tooClose = balls.some(b => Math.abs(b.x - x) < 10 && Math.abs(b.y - y) < 15);
      attempts++;
    } while (tooClose && attempts < 15);

    const newBall = {
      id: Date.now(),
      imageUrl: "/assets/ball.png", 
      x, 
      y, 
      // This is the FINAL scale on the wall
      finalScale: 0.15 + Math.random() * 0.1, 
      rotation: Math.random() * 360
    };
    setBalls(prev => [...prev, newBall]);
  };

  return { balls, isConnected, addTestBall };
}
