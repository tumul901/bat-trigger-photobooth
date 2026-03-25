import React from 'react';
import { usePhotoWall } from '../hooks/usePhotoWall';
import CricketBall from '../components/CricketBall';
 
const Wall = () => {
  const { balls, isConnected, addTestBall, removeBall } = usePhotoWall();
 
  // FIX: --wall-multiplier is removed. Each ball now carries its own birthMultiplier,
  // calculated once at creation in usePhotoWall.js. The Wall no longer needs to
  // broadcast a global scale that accidentally resizes all existing balls.
 
  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Stadium Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: "url('/assets/stadium.png')" }}
      />
 
      {/* Overlay darkening for better contrast */}
      <div className="absolute inset-0 bg-black/30" />
 
      {/* Connection Indicator */}
      <div className="absolute top-4 left-4 z-50 flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-white text-xs font-mono uppercase tracking-widest opacity-70">
          {isConnected ? 'Live Connection active' : 'Connecting to Server...'}
        </span>
      </div>
 
      {/* Manual Test Button */}
      <button
        onClick={addTestBall}
        className="absolute bottom-4 right-4 z-50 px-3 py-1 bg-white/10 hover:bg-white/20 text-white/40 text-[10px] rounded border border-white/10 transition-colors"
      >
        DEBUG: Add Test Ball
      </button>
 
      {/* Render All Balls — no ballCount prop needed anymore */}
      <div className="absolute inset-0">
        {balls.map(ball => (
          <CricketBall key={ball.id} ball={ball} onRemove={removeBall} />
        ))}
      </div>
 
      {/* Header */}
      <div className="absolute top-8 w-full text-center pointer-events-none">
        <h1 className="text-white text-4xl font-black italic uppercase tracking-tighter drop-shadow-2xl opacity-90">
          Batting <span className="text-red-600">Legend</span>
        </h1>
        <p className="text-white/60 text-sm font-medium uppercase tracking-[0.5em] mt-1 drop-shadow-lg">
          Official Photobooth
        </p>
      </div>
    </div>
  );
};
 
export default Wall;