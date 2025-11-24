import { useState, useRef, useEffect } from "react";
import { Upload, ArrowLeftRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type ProcessedImage = {
  canvas: HTMLCanvasElement;
  label: string;
};
const Index = () => {
  const [version] = useState<'v08' | 'v09'>('v09');
  const [imageA, setImageA] = useState<HTMLImageElement | null>(null);
  const [imageB, setImageB] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [showAbout, setShowAbout] = useState(false);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for True Pixel Exchange Engine
  useEffect(() => {
    const workerScript = `
      // Calculate RGB brightness
      function getBrightness(r, g, b) {
        return (r * 299 + g * 587 + b * 114) / 1000;
      }
      
      self.onmessage = function(e) {
        const { type, imageAData, imageBData, width, height } = e.data;
        
        if (type === 'PROCESS_PIXELS') {
          // Flatten all pixels from both images with brightness
          const pixelsA = [];
          const pixelsB = [];
          
          for (let i = 0; i < imageAData.data.length; i += 4) {
            const r = imageAData.data[i];
            const g = imageAData.data[i + 1];
            const b = imageAData.data[i + 2];
            const a = imageAData.data[i + 3];
            
            if (a > 10) {
              pixelsA.push({
                r, g, b, a,
                brightness: getBrightness(r, g, b)
              });
            }
          }
          
          for (let i = 0; i < imageBData.data.length; i += 4) {
            const r = imageBData.data[i];
            const g = imageBData.data[i + 1];
            const b = imageBData.data[i + 2];
            const a = imageBData.data[i + 3];
            
            if (a > 10) {
              pixelsB.push({
                r, g, b, a,
                brightness: getBrightness(r, g, b)
              });
            }
          }
          
          // Sort pixels by brightness
          pixelsA.sort((a, b) => a.brightness - b.brightness);
          pixelsB.sort((a, b) => a.brightness - b.brightness);
          
          // Tile smaller array if needed to match pixel count
          const totalPixels = width * height;
          while (pixelsA.length < totalPixels) {
            pixelsA.push(...pixelsA.slice(0, Math.min(pixelsA.length, totalPixels - pixelsA.length)));
          }
          while (pixelsB.length < totalPixels) {
            pixelsB.push(...pixelsB.slice(0, Math.min(pixelsB.length, totalPixels - pixelsB.length)));
          }
          
          // Create new image data at original resolution
          const newImageAData = new ImageData(width, height);
          const newImageBData = new ImageData(width, height);
          
          // Rebuild A using B's pixels in sorted positions
          for (let i = 0; i < imageAData.data.length; i += 4) {
            const targetR = imageAData.data[i];
            const targetG = imageAData.data[i + 1];
            const targetB = imageAData.data[i + 2];
            const targetA = imageAData.data[i + 3];
            
            if (targetA > 10) {
              const targetBrightness = getBrightness(targetR, targetG, targetB);
              
              // Find position in sorted array using binary search
              let left = 0;
              let right = pixelsA.length - 1;
              let pos = 0;
              
              while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (pixelsA[mid].brightness < targetBrightness) {
                  left = mid + 1;
                  pos = left;
                } else {
                  right = mid - 1;
                }
              }
              
              // Use same position from B's sorted array
              const sourcePixel = pixelsB[Math.min(pos, pixelsB.length - 1)];
              newImageAData.data[i] = sourcePixel.r;
              newImageAData.data[i + 1] = sourcePixel.g;
              newImageAData.data[i + 2] = sourcePixel.b;
              newImageAData.data[i + 3] = sourcePixel.a;
            }
          }
          
          // Rebuild B using A's pixels in sorted positions
          for (let i = 0; i < imageBData.data.length; i += 4) {
            const targetR = imageBData.data[i];
            const targetG = imageBData.data[i + 1];
            const targetB = imageBData.data[i + 2];
            const targetA = imageBData.data[i + 3];
            
            if (targetA > 10) {
              const targetBrightness = getBrightness(targetR, targetG, targetB);
              
              // Find position in sorted array using binary search
              let left = 0;
              let right = pixelsB.length - 1;
              let pos = 0;
              
              while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (pixelsB[mid].brightness < targetBrightness) {
                  left = mid + 1;
                  pos = left;
                } else {
                  right = mid - 1;
                }
              }
              
              // Use same position from A's sorted array
              const sourcePixel = pixelsA[Math.min(pos, pixelsA.length - 1)];
              newImageBData.data[i] = sourcePixel.r;
              newImageBData.data[i + 1] = sourcePixel.g;
              newImageBData.data[i + 2] = sourcePixel.b;
              newImageBData.data[i + 3] = sourcePixel.a;
            }
          }
          
          self.postMessage({ 
            type: 'COMPLETE', 
            newImageAData,
            newImageBData 
          });
        }
      };
    `;
    const blob = new Blob([workerScript], {
      type: 'application/javascript'
    });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = e => {
      if (e.data.type === 'COMPLETE') {
        const resultCanvasA = document.createElement('canvas');
        const resultCanvasB = document.createElement('canvas');
        resultCanvasA.width = e.data.newImageAData.width;
        resultCanvasA.height = e.data.newImageAData.height;
        resultCanvasB.width = e.data.newImageBData.width;
        resultCanvasB.height = e.data.newImageBData.height;
        const resultCtxA = resultCanvasA.getContext('2d');
        const resultCtxB = resultCanvasB.getContext('2d');
        if (resultCtxA && resultCtxB) {
          resultCtxA.putImageData(e.data.newImageAData, 0, 0);
          resultCtxB.putImageData(e.data.newImageBData, 0, 0);
          setResults([{
            canvas: resultCanvasA,
            label: 'Image A rebuilt using pixels from Image B'
          }, {
            canvas: resultCanvasB,
            label: 'Image B rebuilt using pixels from Image A'
          }]);
          setProgress(100);
          setTimeout(() => {
            setIsProcessing(false);
            toast.success('Transformation Complete');
          }, 500);
        }
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
    };
  }, []);
  const handleFileSelect = (file: File, target: 'A' | 'B') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Automatically resize to 1366×768 maintaining aspect ratio
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const targetWidth = 1366;
        const targetHeight = 768;

        // Calculate aspect ratio
        const imgAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        // Fit image within target dimensions maintaining aspect ratio
        if (imgAspect > targetAspect) {
          // Image is wider
          drawHeight = targetWidth / imgAspect;
          offsetY = (targetHeight - drawHeight) / 2;
        } else {
          // Image is taller
          drawWidth = targetHeight * imgAspect;
          offsetX = (targetWidth - drawWidth) / 2;
        }
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw resized image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Create new image from canvas
        const resizedImg = new Image();
        resizedImg.onload = () => {
          if (target === 'A') {
            setImageA(resizedImg);
            toast.success('Image A loaded and resized to 1366×768');
          } else {
            setImageB(resizedImg);
            toast.success('Image B loaded and resized to 1366×768');
          }
        };
        resizedImg.src = canvas.toDataURL('image/png');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  const processImages = () => {
    if (!imageA || !imageB || !workerRef.current) return;
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 3;
      });
    }, 50);

    // Step 1: Use original resolution (no resizing)
    const targetWidth = Math.max(imageA.width, imageB.width);
    const targetHeight = Math.max(imageA.height, imageB.height);

    // Step 2: Process at original resolution
    const canvasA = document.createElement('canvas');
    const canvasB = document.createElement('canvas');
    canvasA.width = targetWidth;
    canvasA.height = targetHeight;
    canvasB.width = targetWidth;
    canvasB.height = targetHeight;
    const ctxA = canvasA.getContext('2d', {
      willReadFrequently: true
    });
    const ctxB = canvasB.getContext('2d', {
      willReadFrequently: true
    });
    if (!ctxA || !ctxB) return;

    // Draw images at matched resolution
    ctxA.drawImage(imageA, 0, 0, targetWidth, targetHeight);
    ctxB.drawImage(imageB, 0, 0, targetWidth, targetHeight);
    const imageAData = ctxA.getImageData(0, 0, targetWidth, targetHeight);
    const imageBData = ctxB.getImageData(0, 0, targetWidth, targetHeight);

    // Step 3: Process pixels in worker
    workerRef.current.postMessage({
      type: 'PROCESS_PIXELS',
      imageAData,
      imageBData,
      width: targetWidth,
      height: targetHeight
    });
  };
  const handleDownload = (canvas: HTMLCanvasElement, label: string) => {
    const link = document.createElement('a');
    link.download = `pixel-rebirth-${label.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Image downloaded');
  };
  const handleReset = () => {
    setImageA(null);
    setImageB(null);
    setResults([]);
    setProgress(0);
    setIsProcessing(false);
  };
  return <div className="min-h-screen w-full flex flex-col relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 w-full px-4 py-3 md:px-6 md:py-4 flex justify-between items-center opacity-0 animate-fade-in" style={{
      animationDelay: '0.1s'
    }}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-black rounded-sm" />
          </div>
          <h1 className="text-sm md:text-xl font-bold tracking-tight text-white">
            PIXEL REBIRTH ENGINE <span className="text-white/80 font-normal"></span>
          </h1>
        </div>
        <div className="text-[8px] md:text-xs font-mono text-white/90 uppercase tracking-wider md:tracking-widest">
          v09 stable
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 w-full max-w-6xl mx-auto">
        {results.length === 0 ? <div className="w-full opacity-0 animate-fade-in" style={{
        animationDelay: '0.2s'
      }}>
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 tracking-tight text-white">
                Pixel Rebirth Engine
              </h2>
              <p className="text-white/90 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                Upload two images for true 1:1 pixel exchange. No compression, no averaging, no interpolation.
                Preserves original resolution with brightness-sorted pixel mapping.
              </p>
            </div>

            {/* Upload Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Image A */}
              <div onClick={() => !isProcessing && fileInputARef.current?.click()} className="bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6 cursor-pointer hover:border-white/40 transition-all">
                <input ref={fileInputARef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.length && handleFileSelect(e.target.files[0], 'A')} disabled={isProcessing} />
                {imageA ? <div className="flex flex-col items-center">
                    <img src={imageA.src} alt="Image A" className="max-h-40 rounded-lg mb-3" />
                    <p className="text-xs font-mono text-white/90">Image A: {imageA.width}×{imageA.height}</p>
                  </div> : <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-3 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Upload Image A</p>
                    <p className="text-xs text-white/70 font-mono">Any resolution</p>
                  </div>}
              </div>

              {/* Image B */}
              <div onClick={() => !isProcessing && fileInputBRef.current?.click()} className="bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl p-6 cursor-pointer hover:border-white/40 transition-all">
                <input ref={fileInputBRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.length && handleFileSelect(e.target.files[0], 'B')} disabled={isProcessing} />
                {imageB ? <div className="flex flex-col items-center">
                    <img src={imageB.src} alt="Image B" className="max-h-40 rounded-lg mb-3" />
                    <p className="text-xs font-mono text-white/90">Image B: {imageB.width}×{imageB.height}</p>
                  </div> : <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-3 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">Upload Image B</p>
                    <p className="text-xs text-white/70 font-mono">Any resolution</p>
                  </div>}
              </div>
            </div>

            {/* Process Button */}
            {imageA && imageB && !isProcessing && <div className="flex justify-center">
                <Button onClick={processImages} className="bg-transparent hover:bg-white/10 border-2 border-white/30 hover:border-white/50 px-8 py-6 rounded-xl text-sm font-mono uppercase tracking-widest flex items-center gap-3 text-white transition-all shadow-none">
                  <ArrowLeftRight className="w-5 h-5" />
                  Start Pixel Rebirth
                </Button>
              </div>}

            {/* Progress Bar */}
            {isProcessing && <div className="w-full max-w-md mx-auto">
                <div className="bg-white/10 rounded-full h-2 overflow-hidden mb-3">
                  <div className="h-full bg-white/90 transition-all duration-300 ease-out" style={{
              width: `${progress}%`
            }} />
                </div>
                <p className="text-center text-xs font-mono text-white/90 uppercase tracking-widest">
                  {progress < 100 ? 'Rebuilding with true pixel exchange…' : 'Transformation Complete'}
                </p>
              </div>}
          </div> : <div className="w-full opacity-0 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight text-white">
                Rebuild Complete
              </h2>
              <p className="text-white/80 text-sm md:text-base">True pixel exchange with brightness-sorted mapping</p>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-5xl mx-auto">
              {results.map((result, idx) => <div key={idx} className="bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl p-4">
                  <div className="bg-black rounded-xl overflow-hidden mb-4">
                    <img src={result.canvas.toDataURL()} alt={result.label} className="w-full h-auto" style={{
                imageRendering: 'pixelated'
              }} />
                  </div>
                  <p className="text-xs font-mono text-white/90 text-center mb-4 font-semibold">{result.label}</p>
                  <Button onClick={() => handleDownload(result.canvas, result.label)} className="w-full bg-transparent hover:bg-white/10 border-2 border-white/30 hover:border-white/50 px-4 py-3 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 text-white transition-all shadow-none">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>)}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center">
              <Button onClick={handleReset} className="bg-transparent hover:bg-white/10 border-2 border-white/30 hover:border-white/50 px-6 py-3 rounded-xl text-sm font-mono uppercase tracking-widest text-white transition-all shadow-none">
                Process New Images
              </Button>
            </div>
          </div>}
      </main>

      {/* Footer with Version */}
      <footer className="relative z-10 w-full flex justify-center px-2 py-3 opacity-0 animate-fade-in" style={{
      animationDelay: '0.5s'
    }}>
        <div className="bg-black/40 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full flex items-center gap-2 md:gap-3 transition-all duration-300 hover:border-white/30 text-[9px] md:text-[10px]">
          <button onClick={() => setShowAbout(true)} className="font-mono uppercase tracking-wider md:tracking-widest hover:text-white text-white/90 transition-colors cursor-pointer">
            About
          </button>
          <div className="w-[1px] h-2 md:h-3 bg-white/30" />
          <a href="https://instagram.com/shohailmahmud09" target="_blank" rel="noopener noreferrer" className="font-mono uppercase tracking-wider md:tracking-widest hover:text-white text-white/90 transition-colors flex items-center gap-1 md:gap-2 whitespace-nowrap">
            <span>@shohailmahmud09</span>
          </a>
          <div className="w-[1px] h-2 md:h-3 bg-white/30" />
          <span className="font-mono uppercase tracking-widest text-white/90">
            {version === 'v09' ? 'V09 STABLE' : 'V08 LEGACY'}
          </span>
        </div>
      </footer>

      {/* About Modal */}
      {showAbout && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto" onClick={() => setShowAbout(false)}>
          <div className="bg-black/60 backdrop-blur-md border-2 border-white/30 p-6 md:p-8 rounded-2xl max-w-md w-full my-auto shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4 text-white text-center">Pixel Rebirth Engine V09  //  stable     </h3>
            <p className="text-white/90 mb-6 leading-relaxed font-mono text-sm">
              The Pixel Rebirth Engine performs true 1:1 pixel exchange with no compression, averaging, or interpolation.
              <br />
              <br />
              All pixels from both images are flattened, sorted by RGB brightness, then swapped in sorted positions. Original resolution is preserved exactly.
              <br />
              <br />
              <span className="text-white/80 font-semibold">
                This version automatically converts any image into 1366×768 resolution before processing.
              </span>
              <br />
              <br />
              All processing runs in your browser using Web Workers. Your images never leave your device.
              <br />
              <br />
              <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Previous Versions
              </span>
              <br />
              <span className="text-white/50 text-xs">
                v2.0.0.9 - Deconstructs your uploaded image pixel-by-pixel and mathematically rearranges it into a target form.     
                <br />
                ​
              </span>
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowAbout(false)} className="px-6 py-2 bg-white text-black rounded-lg font-mono text-sm font-bold hover:bg-white/90 shadow-none transition-all">
                CLOSE
              </Button>
            </div>
          </div>
        </div>}
    </div>;
};
export default Index;