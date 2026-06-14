'use client';

import { useEffect, useRef, useState } from 'react';

/* Minimal typing for the experimental BarcodeDetector API. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

/**
 * Live barcode scanner. Uses the native BarcodeDetector + camera where available
 * (Chrome/Android); always offers manual entry as a fallback (iOS Safari, denied
 * camera, or unsupported browsers).
 */
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    const Ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
      return;
    }
    setSupported(true);

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new Ctor({ formats: FORMATS });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (stopped) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0]!.rawValue) {
              onDetected(codes[0]!.rawValue.replace(/\D/g, ''));
              return; // stop on first hit
            }
          } catch {
            // transient detect errors are fine; keep scanning
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCamError('Camera unavailable — enter the barcode number instead.');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {supported && !camError && (
        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '4 / 3',
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '28% 12%',
              border: '2px solid rgba(255,255,255,0.9)',
              borderRadius: 10,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.25)',
            }}
          />
        </div>
      )}

      <p className="muted" style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
        {supported === false
          ? 'Live scanning isn’t supported here. Enter the barcode number:'
          : camError
            ? camError
            : 'Point your camera at a barcode.'}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const code = manual.replace(/\D/g, '');
          if (code.length >= 6) onDetected(code);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          className="input"
          inputMode="numeric"
          placeholder="Barcode number"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button className="btn btn-secondary" style={{ width: 'auto' }} type="submit">
          Look up
        </button>
      </form>
    </div>
  );
}
