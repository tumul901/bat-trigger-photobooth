/**
 * Port of the Python MotionAnalyzer and SwingDetector for the browser.
 * Uses MediaPipe Pose coordinates to detect heavy bat swings.
 */

export class MotionAnalyzer {
    constructor(bufferSize = 15) {
        this.bufferSize = bufferSize;
        this.leftWristBuffer = [];
        this.rightWristBuffer = [];
    }

    update(wristPoints) {
        // Add to buffers, maintaining max size
        this.leftWristBuffer.push(wristPoints.left_wrist || null);
        if (this.leftWristBuffer.length > this.bufferSize) this.leftWristBuffer.shift();

        this.rightWristBuffer.push(wristPoints.right_wrist || null);
        if (this.rightWristBuffer.length > this.bufferSize) this.rightWristBuffer.shift();
    }

    getMotionFeatures(side = 'right') {
        const buffer = side === 'right' ? this.rightWristBuffer : this.leftWristBuffer;
        const points = buffer.filter(p => p !== null);

        if (points.length < 2) return null;

        const v1 = points[points.length - 2];
        const v2 = points[points.length - 1];

        // 1. Velocity (px per frame)
        const velocity = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));

        // 2. Direction
        const direction = { dx: v2.x - v1.x, dy: v2.y - v1.y };

        // 3. Acceleration
        let acceleration = 0;
        if (points.length >= 3) {
            const v0 = points[points.length - 3];
            const vel1 = Math.sqrt(Math.pow(v1.x - v0.x, 2) + Math.pow(v1.y - v0.y, 2));
            const vel2 = velocity;
            acceleration = vel2 - vel1;
        }

        // 4. Total Displacement over window
        const pStart = points[0];
        const pEnd = points[points.length - 1];
        const displacement = Math.sqrt(Math.pow(pEnd.x - pStart.x, 2) + Math.pow(pEnd.y - pStart.y, 2));

        return {
            velocity,
            acceleration,
            direction,
            displacement,
            path: points
        };
    }
}

export class SwingDetector {
    constructor(options = {}) {
        this.minVelocity = options.minVelocity || 30;
        this.minAcceleration = options.minAcceleration || 20;
        this.minDisplacement = options.minDisplacement || 150;
        this.debounceTime = options.debounceTime || 5000; // 5 seconds
        this.resetVelocity = options.resetVelocity || 10;
        
        this.lastSwingTime = 0;
        this.isRecovering = false;
    }

    getRemainingDebounce() {
        const now = Date.now();
        const diff = now - this.lastSwingTime;
        return Math.max(0, (this.debounceTime - diff) / 1000);
    }

    detectSwing(features) {
        if (!features) return false;

        const now = Date.now();
        if (now - this.lastSwingTime < this.debounceTime) return false;

        const { velocity, acceleration, displacement, direction } = features;

        // Handle Recovery
        if (this.isRecovering) {
            if (velocity < this.resetVelocity) {
                this.isRecovering = false;
                console.log("DEBUG: Swing detector reset complete");
            }
            return false;
        }

        // Swing Logic
        const isFast = velocity > this.minVelocity;
        const isAccelerating = acceleration > this.minAcceleration;
        const hasDisplacement = displacement > this.minDisplacement;
        
        // Horizontal arc preference
        const isHorizontal = Math.abs(direction.dx) > Math.abs(direction.dy) * 0.5;

        if ((isFast || isAccelerating) && hasDisplacement && isHorizontal) {
            this.lastSwingTime = now;
            this.isRecovering = true;
            return true;
        }

        return false;
    }
}
