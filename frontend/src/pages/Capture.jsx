import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { 
    PoseLandmarker, 
    FilesetResolver, 
    DrawingUtils 
} from "@mediapipe/tasks-vision";
import { MotionAnalyzer, SwingDetector } from '../utils/SwingDetection';

const VITE_API_URL = import.meta.env.VITE_API_URL || `http://127.0.0.1:8080`;

const Capture = () => {
    const [state, setState] = useState('idle'); // idle | preview | uploading | ready | done
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isDetectorReady, setIsDetectorReady] = useState(false);
    const [isCompositingDone, setIsCompositingDone] = useState(false);
    const [debugFeatures, setDebugFeatures] = useState(null);
    const [showDebug, setShowDebug] = useState(true); // Default to true for tuning
    
    // Refs for detection
    const videoRef = useRef(null);
    const landmarkerRef = useRef(null);
    const analyzerRef = useRef(new MotionAnalyzer(15));
    const detectorRef = useRef(new SwingDetector({ debounceTime: 5000 }));
    const requestRef = useRef(null);
    const swingPendingRef = useRef(false);
    const isDetectingRef = useRef(false);
    const wsRef = useRef(null);
    const crowdAudio = useRef(new Audio('/sounds/crowd.mp3'));
    const hitAudio = useRef(new Audio('/sounds/hit.mp3'));
    
    const navigate = useNavigate();

    // 1. Initialize MediaPipe & Webcam
    useEffect(() => {
        const initPose = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "/mediapipe/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `/models/pose_landmarker_full.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numPoses: 1
                });
                landmarkerRef.current = landmarker;
                setIsDetectorReady(true);
                console.log("DEBUG: MediaPipe Pose Landmarker loaded");
            } catch (err) {
                console.error("DEBUG: Failed to load MediaPipe:", err);
            }
        };

        const startWebcam = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'user', 
                        width: { ideal: 1280 }, 
                        height: { ideal: 720 } 
                    },
                    audio: false
                });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (err) {
                console.error("DEBUG: Webcam access denied:", err);
            }
        };

        initPose();
        if (state === 'idle' || state === 'ready' || state === 'uploading') startWebcam();

        // WebSocket for sync
        const wsUrl = VITE_API_URL.replace('http', 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'compositing_done') {
                setIsCompositingDone(true);
            }
        };

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []); // Only on mount

    // Handle webcam restart when switching states
    useEffect(() => {
        if ((state === 'idle' || state === 'ready' || state === 'uploading') && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [state, stream]);

    // 2. Capture Photo
    const handleCapture = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw unmirrored — the viewfinder shows mirrored via CSS (.mirror-mode)
        // but the actual photo we send to the server must NOT be mirrored
        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setState('preview');
    };

    // 3. Confirm & Wait for Compositing
    const handleConfirm = async () => {
        setState('uploading');
        setIsCompositingDone(false);
        swingPendingRef.current = false;

        // Extract blob from data URL
        const blob = await (await fetch(capturedImage)).blob();
        const formData = new FormData();
        formData.append('image', blob, 'capture.jpg');

        try {
            console.log(`DEBUG: Uploading to ${VITE_API_URL}/api/capture`);
            const response = await fetch(`${VITE_API_URL}/api/capture`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            console.log("DEBUG: Photo uploaded successfully", data);
        } catch (err) {
            console.error("DEBUG: Upload failed:", err);
        }
    };

    // 4. Auto-transition to Ready
    useEffect(() => {
        if (state === 'uploading' && isCompositingDone) {
            setState('ready');
            // If user swung while we were waiting, fire it now!
            if (swingPendingRef.current) {
                console.log("DEBUG: Firing queued swing!");
                fetch(`${VITE_API_URL}/api/swing`, { method: 'POST' });
                setState('done');
            }
        }
    }, [state, isCompositingDone]);

    // 5. Swing Detection Loop
    useEffect(() => {
        if (!['uploading', 'ready'].includes(state) || !isDetectorReady || !landmarkerRef.current) {
            isDetectingRef.current = false;
            return;
        }

        isDetectingRef.current = true;
        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        
        const detect = async () => {
            if (!isDetectingRef.current) return; 
            
            if (video.readyState >= 2) {
                const startTimeMs = performance.now();
                const results = await landmarker.detectForVideo(video, startTimeMs);

                if (results.landmarks && results.landmarks.length > 0) {
                    const landmarks = results.landmarks[0];
                    // MediaPipe Landmarks: 15: Left Wrist, 16: Right Wrist
                    const wristPoints = {};
                    if (landmarks[15] && landmarks[15].visibility > 0.5) {
                        wristPoints.left_wrist = { x: landmarks[15].x * 1000, y: landmarks[15].y * 1000 };
                    }
                    if (landmarks[16] && landmarks[16].visibility > 0.5) {
                        wristPoints.right_wrist = { x: landmarks[16].x * 1000, y: landmarks[16].y * 1000 };
                    }

                    // Update Motion Analyzer (using right wrist as primary, or whichever is available)
                    analyzerRef.current.update(wristPoints);
                    const features = analyzerRef.current.getMotionFeatures('right') || analyzerRef.current.getMotionFeatures('left');
                    
                    if (features) {
                        setDebugFeatures({
                            velocity: features.velocity,
                            acceleration: features.acceleration,
                            displacement: features.displacement,
                            isHorizontal: Math.abs(features.direction.dx) > Math.abs(features.direction.dy) * 0.5
                        });
                    }

                    if (detectorRef.current.detectSwing(features)) {
                        console.log("DEBUG: Swing detected in browser!");
                        
                        if (state === 'uploading') {
                            console.log("DEBUG: Swing queued (compositing still in progress)");
                            swingPendingRef.current = true;
                        } else {
                            // 1. Play Hit Sound
                            hitAudio.current.currentTime = 0;
                            hitAudio.current.play().catch(e => console.warn("Audio play blocked", e));

                            // 2. Kill detection loop immediately (before state change propagation)
                            isDetectingRef.current = false;
                            setState('done');
                            
                            // 3. Trigger server
                            try {
                                await fetch(`${VITE_API_URL}/api/swing`, { method: 'POST' });
                            } catch (e) {
                                console.error("DEBUG: Failed to trigger swing api", e);
                            }
                        }
                    }
                }
            }
            requestRef.current = requestAnimationFrame(detect);
        };

        detect();

        return () => {
            isDetectingRef.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [state, isDetectorReady]);

    // 5. Session Reset & Sound Management
    useEffect(() => {
        if (state === 'ready') {
            crowdAudio.current.loop = true;
            crowdAudio.current.volume = 0.4;
            crowdAudio.current.play().catch(e => console.warn("Audio play blocked", e));
        }

        if (state === 'done') {
            // Fade out crowd, maybe add victory cheer
            gsap.to(crowdAudio.current, { volume: 0, duration: 2, onComplete: () => crowdAudio.current.pause() });
            
            const timer = setTimeout(() => {
                setState('idle');
                // Flush buffer
                analyzerRef.current = new MotionAnalyzer(15);
            }, 8000);
            return () => clearTimeout(timer);
        }

        if (state === 'idle') {
            crowdAudio.current.pause();
            crowdAudio.current.currentTime = 0;
        }
    }, [state]);

    useGSAP(() => {
        if (state === 'ready') {
            gsap.fromTo(".ready-icon", 
                { scale: 0.8, opacity: 0 },
                { scale: 1.1, opacity: 1, duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut" }
            );
        }
        if (state === 'done') {
            gsap.fromTo(".done-text",
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: "back.out" }
            );
        }
    }, [state]);    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white">
            
            {/* --- CORE VIDEO LAYER (Always Mounted) --- */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`absolute inset-0 w-full h-full object-cover mirror-mode transition-opacity duration-700 ${
                    (state === 'idle' || state === 'ready') ? 'opacity-100' : 
                    (state === 'uploading') ? 'opacity-20 grayscale' : 'opacity-0'
                }`}
            />

            {/* --- IDLE STATE: Capture UI --- */}
            {state === 'idle' && (
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                    {/* Face Guide Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] border-4 border-white/30 rounded-full border-dashed animate-pulse ring-[2000px] ring-black/50" />
                    </div>

                    <div className="absolute top-12 text-center">
                        <h2 className="text-3xl font-black uppercase tracking-tighter italic">Position Your Face</h2>
                        <p className="opacity-60 text-sm mt-2 font-medium tracking-[0.3em]">INSIDE THE CIRCLE</p>
                    </div>

                    <button 
                        onClick={handleCapture}
                        className="absolute bottom-16 w-20 h-20 bg-white rounded-full border-4 border-white/20 active:scale-90 transition-transform flex items-center justify-center"
                    >
                        <div className="w-16 h-16 bg-red-600 rounded-full" />
                    </button>
                </div>
            )}

            {/* --- PREVIEW STATE --- */}
            {state === 'preview' && (
                <div className="relative z-20 w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                    <img 
                        src={capturedImage} 
                        alt="Capture Preview"
                        className="max-w-[80%] max-h-[70%] rounded-2xl shadow-2xl border-4 border-white/10"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                    
                    <div className="mt-12 flex space-x-6">
                        <button 
                            onClick={() => setState('idle')}
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold uppercase tracking-widest text-sm border border-white/10 transition-colors"
                        >
                            Retake
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="px-10 py-3 bg-red-600 hover:bg-red-700 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl shadow-red-900/40 transition-all active:scale-95"
                        >
                            Confirm Photo
                        </button>
                    </div>
                </div>
            )}

            {/* --- UPLOADING STATE --- */}
            {state === 'uploading' && (
                <div className="absolute inset-0 z-30 bg-[#0a0a0a]/60 backdrop-blur-md flex flex-col items-center justify-center text-center px-10">
                    <div className="relative z-10">
                        <div className="w-16 h-16 border-4 border-white/10 border-t-red-600 rounded-full animate-spin mb-8 mx-auto" />
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Preparing Your <br/> <span className="text-red-500">Ball</span></h2>
                        <p className="mt-4 text-white/30 text-xs font-medium uppercase tracking-[0.3em]">Detection will be active shortly...</p>
                    </div>
                </div>
            )}

            {/* --- READY STATE --- */}
            {state === 'ready' && (
                <div className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center text-center px-10">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="ready-icon text-[120px] mb-8">🏏</div>
                        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter">
                            Get Ready <br/> <span className="text-red-600 underline">To Swing!</span>
                        </h1>
                        
                        {!isDetectorReady ? (
                             <p className="mt-8 text-white/30 font-medium uppercase tracking-[0.2em] text-xs animate-pulse">
                                Initializing detection...
                             </p>
                        ) : (
                            <div className="mt-8 space-y-2">
                                <p className="text-green-500 font-bold uppercase tracking-[0.4em] text-sm animate-pulse">
                                    Detection Active
                                </p>
                                <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                                    Swing the bat in front of the camera
                                </p>
                            </div>
                        )}
                        
                        {/* Simulation Button for Testing */}
                        <button 
                            onClick={async () => {
                                await fetch(`${VITE_API_URL}/api/swing`, { method: 'POST' });
                                setState('done');
                            }}
                            className="mt-16 px-6 py-2 bg-white/5 hover:bg-white/10 text-white/20 text-[10px] rounded border border-white/5 transition-colors uppercase tracking-[0.3em]"
                        >
                            [ Manual Trigger ]
                        </button>

                        <button 
                            onClick={() => setState('idle')}
                            className="mt-8 text-white/20 text-xs uppercase tracking-widest hover:text-white/40"
                        >
                            Reset / Back to Camera
                        </button>
                    </div>
                </div>
            )}

            {/* --- DEBUG OVERLAY --- */}
            {showDebug && debugFeatures && (
                <div className="absolute top-4 left-4 z-[100] bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 font-mono text-[10px] space-y-1 pointer-events-none">
                    <div className="text-red-500 font-bold mb-2 flex justify-between items-center">
                        <span>DETECTOR METRICS</span>
                        <span className="text-[8px] animate-pulse">LIVE</span>
                    </div>
                    <div className="flex justify-between w-40">
                        <span>Velocity:</span>
                        <span className={debugFeatures.velocity > 30 ? "text-green-400 font-bold" : ""}>
                            {debugFeatures.velocity.toFixed(1)}
                        </span>
                    </div>
                    <div className="flex justify-between w-40">
                        <span>Accel:</span>
                        <span className={debugFeatures.acceleration > 20 ? "text-green-400 font-bold" : ""}>
                            {debugFeatures.acceleration.toFixed(1)}
                        </span>
                    </div>
                    <div className="flex justify-between w-40">
                        <span>Displace:</span>
                        <span className={debugFeatures.displacement > 150 ? "text-green-400 font-bold" : ""}>
                            {debugFeatures.displacement.toFixed(1)}
                        </span>
                    </div>
                    <div className="flex justify-between w-40 border-t border-white/10 mt-1 pt-1">
                        <span>Horizontal:</span>
                        <span className={debugFeatures.isHorizontal ? "text-green-400" : "text-red-400"}>
                            {debugFeatures.isHorizontal ? "YES" : "NO"}
                        </span>
                    </div>
                    <div className="mt-2 text-[8px] opacity-40 italic">
                        Thresholds: V{">"}30, A{">"}20, D{">"}150
                    </div>
                </div>
            )}

            {/* --- DONE STATE (Celebration) --- */}
            {state === 'done' && (
                <div className="absolute inset-0 z-50 bg-red-600 flex flex-col items-center justify-center text-center px-10">
                    <div className="text-[120px] mb-8 animate-bounce">🎉</div>
                    <h1 className="done-text text-6xl md:text-8xl font-black italic uppercase tracking-tighter">
                        Great <br/> Shot!
                    </h1>
                    <p className="mt-8 text-white/80 font-bold uppercase tracking-[0.4em] text-sm italic">
                        Check the big screen
                    </p>
                    
                    <div className="absolute bottom-12 w-full flex flex-col items-center">
                         <div className="w-48 h-1.5 bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white animate-[progress_8s_linear]" />
                         </div>
                         <p className="mt-4 text-white/40 text-[10px] uppercase tracking-widest">Restarting Session...</p>
                    </div>
                </div>
            )}

            <style>{`
                .mirror-mode { transform: scaleX(-1); }
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default Capture;
