
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { extractCaseFromImage } from '../services/geminiService';

interface OCRScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
}

const OCRScanner: React.FC<OCRScannerProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);

    const base64Image = canvasRef.current.toDataURL('image/jpeg');

    try {
      const data = await extractCaseFromImage(base64Image);
      onScanComplete(data);
    } catch (err) {
      setError("Échec de l'analyse IA. Assurez-vous que le document est lisible.");
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[60] flex flex-col">
      <div className="p-4 flex justify-between items-center text-white border-b border-slate-800">
        <h3 className="font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Scanner Intelligent
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <p className="text-red-400 mb-4 font-medium">{error}</p>
            <button 
              onClick={() => { setError(null); startCamera(); }}
              className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none">
              <div className="w-full h-full border-2 border-indigo-500/50 rounded-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500"></div>
                
                {/* Scanning Animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-[scan_2s_linear_infinite]"></div>
              </div>
            </div>

            {isScanning && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in">
                <div className="relative mb-6">
                  <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Sparkles className="w-8 h-8 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <h4 className="text-xl font-bold mb-2">Lecture du document par l'IA...</h4>
                <p className="text-slate-400 text-sm max-w-xs">Nous extrayons les noms, montants et coordonnées pour vous.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-8 bg-slate-900 border-t border-slate-800 flex justify-center">
        {!error && !isScanning && (
          <button 
            onClick={captureAndScan}
            className="group relative bg-white hover:bg-indigo-50 text-slate-900 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-8 border-slate-800"
          >
            <Camera className="w-8 h-8 text-indigo-600" />
            <div className="absolute -inset-2 border border-white/20 rounded-full group-hover:animate-ping opacity-20 pointer-events-none"></div>
          </button>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default OCRScanner;
