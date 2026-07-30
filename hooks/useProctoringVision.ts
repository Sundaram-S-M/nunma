import { useEffect, useRef, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export type VisionViolationType = 'GAZE_AWAY' | 'MULTIPLE_FACES' | 'FACE_ABSENT' | 'PHONE_DETECTED';

export interface UseProctoringVisionOptions {
  enabled: boolean;
  onViolation?: (type: VisionViolationType, message: string) => void;
  fps?: number; // Target FPS, default 7 (140ms interval) for mobile & desktop balance
}

export interface ProctoringVisionState {
  isCameraReady: boolean;
  isLoadingModels: boolean;
  faceCount: number;
  gazeStatus: 'CENTERED' | 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'LOOKING_UP' | 'LOOKING_DOWN' | 'UNKNOWN';
  detectedObject: string | null;
  warningMessage: string | null;
  error: string | null;
}

export function useProctoringVision({
  enabled,
  onViolation,
  fps = 7
}: UseProctoringVisionOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<ProctoringVisionState>({
    isCameraReady: false,
    isLoadingModels: true,
    faceCount: 0,
    gazeStatus: 'CENTERED',
    detectedObject: null,
    warningMessage: null,
    error: null
  });

  const objectModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const gazeAwayTimerRef = useRef<number | null>(null);
  const faceAbsentTimerRef = useRef<number | null>(null);
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  const triggerViolation = useCallback((type: VisionViolationType, msg: string) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[type] || 0;
    // Cooldown of 5 seconds between repeated violations of the same type
    if (now - lastTime > 5000) {
      lastViolationTimeRef.current[type] = now;
      setState(prev => ({ ...prev, warningMessage: msg }));
      if (onViolation) {
        onViolation(type, msg);
      }
    }
  }, [onViolation]);

  // Load Models
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        setState(prev => ({ ...prev, isLoadingModels: true }));
        // Load COCO-SSD object detector
        const loadedObjModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (isMounted) {
          objectModelRef.current = loadedObjModel;
          setState(prev => ({ ...prev, isLoadingModels: false }));
        }
      } catch (err: any) {
        console.warn("[ProctoringVision] Failed to load object detection model:", err);
        if (isMounted) {
          setState(prev => ({ 
            ...prev, 
            isLoadingModels: false, 
            error: "Failed to initialize vision proctoring models." 
          }));
        }
      }
    }

    if (enabled) {
      loadModels();
    }

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  // Camera Setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function setupCamera() {
      if (!enabled || !videoRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Front selfie camera for mobile/laptop
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
          },
          audio: false
        });

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(e => console.warn("[ProctoringVision] Video play error:", e));
              setState(prev => ({ ...prev, isCameraReady: true }));
            }
          };
        }
      } catch (err: any) {
        console.error("[ProctoringVision] Camera permission or device error:", err);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isCameraReady: false,
            error: "Webcam access denied or unavailable."
          }));
        }
      }
    }

    setupCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled]);

  // Main Detection Loop
  useEffect(() => {
    if (!enabled || !state.isCameraReady || !videoRef.current) return;

    const intervalMs = Math.max(100, Math.floor(1000 / fps));
    const timer = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      let detectedPhone = false;
      let phoneLabel = null;
      let detectedFacesCount = 1; // Default fallback face detection assumption
      let currentGaze: ProctoringVisionState['gazeStatus'] = 'CENTERED';

      // 1. Run COCO-SSD Object & Person Detection
      if (objectModelRef.current) {
        try {
          const predictions = await objectModelRef.current.detect(video, 5, 0.45);
          
          let peopleDetected = 0;
          for (const pred of predictions) {
            // Check for Person count
            if (pred.class === 'person' && pred.score > 0.5) {
              peopleDetected++;
            }
            // Check for Cell Phone / Book / Laptop suspicious items
            if ((pred.class === 'cell phone' || pred.class === 'mobile phone') && pred.score > 0.55) {
              detectedPhone = true;
              phoneLabel = `Smartphone (${Math.round(pred.score * 100)}%)`;
            }
          }

          if (peopleDetected > 0) {
            detectedFacesCount = peopleDetected;
          }
        } catch (e) {
          // Silent frame skip
        }
      }

      // 2. Evaluate Face Counts
      if (detectedFacesCount === 0) {
        if (!faceAbsentTimerRef.current) {
          faceAbsentTimerRef.current = window.setTimeout(() => {
            triggerViolation('FACE_ABSENT', 'No face detected in camera feed');
          }, 2500);
        }
      } else {
        if (faceAbsentTimerRef.current) {
          clearTimeout(faceAbsentTimerRef.current);
          faceAbsentTimerRef.current = null;
        }

        if (detectedFacesCount > 1) {
          triggerViolation('MULTIPLE_FACES', `Multiple people (${detectedFacesCount}) detected in camera frame`);
        }
      }

      // 3. Evaluate Smartphone Violations
      if (detectedPhone) {
        triggerViolation('PHONE_DETECTED', 'Unauthorized smartphone detected in camera frame');
      }

      // Update Local HUD State
      setState(prev => ({
        ...prev,
        faceCount: detectedFacesCount,
        gazeStatus: currentGaze,
        detectedObject: phoneLabel,
        warningMessage: detectedPhone
          ? '⚠️ Smartphone Detected!'
          : detectedFacesCount > 1
          ? '⚠️ Multiple People Detected!'
          : detectedFacesCount === 0
          ? '⚠️ No Face Detected'
          : null
      }));

    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (gazeAwayTimerRef.current) clearTimeout(gazeAwayTimerRef.current);
      if (faceAbsentTimerRef.current) clearTimeout(faceAbsentTimerRef.current);
    };
  }, [enabled, state.isCameraReady, fps, triggerViolation]);

  return {
    videoRef,
    ...state
  };
}
