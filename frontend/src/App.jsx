import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Cpu,
  Layers,
  Bot,
  Sparkles,
  Upload,
  Play,
  Copy,
  ExternalLink,
  Clock,
  Gauge,
  Code,
  Eye,
  RefreshCw,
  Check,
  AlertCircle,
  Trash2,
  Settings,
  Flame,
  Camera,
  Video
} from 'lucide-react';

const INITIAL_SWARM_STATE = {
  pm: { content: '', status: 'idle', metrics: null },
  designer: { content: '', status: 'idle', metrics: null },
  developer: { content: '', status: 'idle', metrics: null },
  qa: { content: '', status: 'idle', metrics: null },
  polish: { content: '', status: 'idle', metrics: null },
  finalCode: '',
  error: '',
};

function calculateSharpness(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let totalDiff = 0;
  let count = 0;
  const step = 4;

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const val = (data[idx] + data[idx+1] + data[idx+2]) / 3;

      const idxRight = (y * width + (x + 1)) * 4;
      const valRight = (data[idxRight] + data[idxRight+1] + data[idxRight+2]) / 3;

      const idxDown = ((y + 1) * width + x) * 4;
      const valDown = (data[idxDown] + data[idxDown+1] + data[idxDown+2]) / 3;

      totalDiff += Math.abs(val - valRight) + Math.abs(val - valDown);
      count++;
    }
  }
  return count > 0 ? (totalDiff / count) : 0;
}

export default function App() {
  const [image, setImage] = useState(null);
  const [imageName, setImageName] = useState('');
  const [cerebrasApiKey, setCerebrasApiKey] = useState(localStorage.getItem('CEREBRAS_API_KEY') || '');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434/v1');
  const [ollamaModel, setOllamaModel] = useState('gemma4');
  const [reasoningEffort, setReasoningEffort] = useState('none');
  const [saveKey, setSaveKey] = useState(!!localStorage.getItem('CEREBRAS_API_KEY'));

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('cerebras'); 
  const [previewTab, setPreviewTab] = useState('preview'); 
  
  // Timer States
  const [cerebrasTimer, setCerebrasTimer] = useState(0);
  const [ollamaTimer, setOllamaTimer] = useState(0);
  const [cerebrasFinishedTime, setCerebrasFinishedTime] = useState(null);
  const [ollamaFinishedTime, setOllamaFinishedTime] = useState(null);
  
  const [cerebrasSwarm, setCerebrasSwarm] = useState(INITIAL_SWARM_STATE);
  const [ollamaSwarm, setOllamaSwarm] = useState(INITIAL_SWARM_STATE);

  // Webcam States
  const [inputMode, setInputMode] = useState('upload'); 
  const [webcamActive, setWebcamActive] = useState(false);
  const [sharpness, setSharpness] = useState(0);
  const [threshold, setThreshold] = useState(13); 
  const [autoSnap, setAutoSnap] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [webcamError, setWebcamError] = useState('');
  const [mirrorVideo, setMirrorVideo] = useState(false);

  const cerebrasTimerRef = useRef(null);
  const ollamaTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Scroll Container Refs (Local Scrolling)
  const cerebrasScrollRef = useRef(null);
  const ollamaScrollRef = useRef(null);

  useEffect(() => {
    if (saveKey) {
      localStorage.setItem('CEREBRAS_API_KEY', cerebrasApiKey);
    } else {
      localStorage.removeItem('CEREBRAS_API_KEY');
    }
  }, [cerebrasApiKey, saveKey]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    processImageFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processImageFile(file);
  };

  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      setImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Webcam Lifecycle
  const startWebcam = async (deviceId = selectedDeviceId) => {
    setWebcamError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError("Not running in a Secure Context (requires localhost or HTTPS).");
      setInputMode('upload');
      return;
    }

    try {
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 } 
          : { width: 640, height: 480, facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setWebcamActive(true);
      }

      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !deviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn("Primary camera request failed, trying desktop fallback...", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setWebcamActive(true);
        }

        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
      } catch (fallbackErr) {
        console.error("Camera access failed completely:", fallbackErr);
        
        try {
          const deviceInfos = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
          setDevices(videoDevices);
        } catch (enumErr) {
          console.error("Failed to enumerate devices on fallback:", enumErr);
        }

        setWebcamActive(false);
        setWebcamError(fallbackErr.message || String(fallbackErr));
      }
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setWebcamActive(false);
    }
  };

  useEffect(() => {
    if (inputMode === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [inputMode]);

  // Sharpness Monitoring Loop
  useEffect(() => {
    let checkTimeout;
    let consecSharpFrames = 0;

    const runFrameCheck = () => {
      if (inputMode === 'webcam' && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          canvas.width = 160; 
          canvas.height = 120;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const score = calculateSharpness(ctx, canvas.width, canvas.height);
          setSharpness(score);

          if (autoSnap && score > threshold) {
            consecSharpFrames++;
            if (consecSharpFrames >= 4) { 
              snapPhoto();
              consecSharpFrames = 0;
            }
          } else {
            consecSharpFrames = 0;
          }
        }
      }
      checkTimeout = setTimeout(runFrameCheck, 150); 
    };

    if (inputMode === 'webcam' && webcamActive) {
      runFrameCheck();
    }

    return () => clearTimeout(checkTimeout);
  }, [inputMode, webcamActive, autoSnap, threshold]);

  const snapPhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth || 640;
      captureCanvas.height = video.videoHeight || 480;
      const ctx = captureCanvas.getContext('2d');

      if (mirrorVideo) {
        ctx.translate(captureCanvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      const base64 = captureCanvas.toDataURL('image/png').split(',')[1];
      
      setImage(base64);
      setImageName('webcam-capture.png');

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      setInputMode('upload');
      triggerSwarmStart(base64);
    }
  };

  // Run the Swarm API call
  const triggerSwarmStart = async (targetImage) => {
    const activeImage = targetImage || image;
    if (!activeImage) return;
    if (!cerebrasApiKey) {
      alert('Please enter your Cerebras API Key.');
      return;
    }

    // Reset Swarms
    setCerebrasSwarm(INITIAL_SWARM_STATE);
    setOllamaSwarm(INITIAL_SWARM_STATE);
    setIsRunning(true);
    setCerebrasFinishedTime(null);
    setOllamaFinishedTime(null);
    setCerebrasTimer(0);
    setOllamaTimer(0);

    // Start timers
    const cStart = Date.now();
    cerebrasTimerRef.current = setInterval(() => {
      setCerebrasTimer(Math.round((Date.now() - cStart) / 100) / 10);
    }, 100);

    const oStart = Date.now();
    ollamaTimerRef.current = setInterval(() => {
      setOllamaTimer(Math.round((Date.now() - oStart) / 100) / 10);
    }, 100);

    try {
      const response = await fetch('http://localhost:3001/api/swarm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: activeImage,
          cerebrasApiKey,
          ollamaUrl,
          ollamaModel,
          reasoningEffort,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start swarm server connection.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              handleSwarmEvent(data);
            } catch (e) {
              console.error('Error parsing SSE payload:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setCerebrasSwarm(prev => ({ ...prev, error: err.message }));
      setOllamaSwarm(prev => ({ ...prev, error: err.message }));
      stopTimers();
    } finally {
      setIsRunning(false);
      stopTimers();
    }
  };

  const stopTimers = () => {
    if (cerebrasTimerRef.current) clearInterval(cerebrasTimerRef.current);
    if (ollamaTimerRef.current) clearInterval(ollamaTimerRef.current);
  };

  const handleSwarmEvent = (event) => {
    const { provider, step, type, content, metrics, error, code } = event;
    const isCerebras = provider === 'cerebras';
    const setSwarm = isCerebras ? setCerebrasSwarm : setOllamaSwarm;

    if (type === 'start') {
      setSwarm(prev => ({
        ...prev,
        [step]: { ...prev[step], status: 'thinking', content: '' }
      }));
    } else if (type === 'chunk') {
      setSwarm(prev => {
        const updatedStep = {
          ...prev[step],
          status: 'streaming',
          content: prev[step].content + content
        };
        
        // Local scroll height adjustment to prevent full-page jitter
        setTimeout(() => {
          if (isCerebras) {
            if (cerebrasScrollRef.current) {
              cerebrasScrollRef.current.scrollTop = cerebrasScrollRef.current.scrollHeight;
            }
          } else {
            if (ollamaScrollRef.current) {
              ollamaScrollRef.current.scrollTop = ollamaScrollRef.current.scrollHeight;
            }
          }
        }, 30);

        return {
          ...prev,
          [step]: updatedStep
        };
      });
    } else if (type === 'end') {
      setSwarm(prev => ({
        ...prev,
        [step]: { ...prev[step], status: 'done', metrics }
      }));
    } else if (type === 'error') {
      setSwarm(prev => ({
        ...prev,
        [step]: { ...prev[step], status: 'error' },
        error: error || 'An error occurred during agent execution.'
      }));
    } else if (type === 'complete') {
      setSwarm(prev => ({
        ...prev,
        finalCode: code
      }));

      if (isCerebras) {
        if (cerebrasTimerRef.current) clearInterval(cerebrasTimerRef.current);
        setCerebrasFinishedTime(prev => prev === null ? cerebrasTimer : prev);
      } else {
        if (ollamaTimerRef.current) clearInterval(ollamaTimerRef.current);
        setOllamaFinishedTime(prev => prev === null ? ollamaTimer : prev);
      }
    } else if (type === 'abort') {
      setSwarm(prev => ({
        ...prev,
        error: error || 'Swarm execution aborted.'
      }));
      if (isCerebras) {
        if (cerebrasTimerRef.current) clearInterval(cerebrasTimerRef.current);
      } else {
        if (ollamaTimerRef.current) clearInterval(ollamaTimerRef.current);
      }
    }
  };

  const getAgentBranding = (step) => {
    switch (step) {
      case 'pm': return { title: 'Product Manager', color: 'border-emerald-500 text-emerald-400 bg-emerald-950/20' };
      case 'designer': return { title: 'UX/UI Designer', color: 'border-violet-500 text-violet-400 bg-violet-950/20' };
      case 'developer': return { title: 'Frontend Developer', color: 'border-cyan-500 text-cyan-400 bg-cyan-950/20' };
      case 'qa': return { title: 'QA Auditor', color: 'border-amber-500 text-amber-400 bg-amber-950/20' };
      case 'polish': return { title: 'Developer (Polish Pass)', color: 'border-rose-500 text-rose-400 bg-rose-950/20' };
      default: return { title: 'Agent', color: 'border-slate-500 text-slate-400 bg-slate-950/20' };
    }
  };

  const renderAgentTimeline = (swarm, scrollRef, isCerebras) => {
    const steps = ['pm', 'designer', 'developer', 'qa', 'polish'];
    return (
      <div 
        ref={scrollRef}
        className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin"
      >
        {steps.map(step => {
          const stepData = swarm[step];
          const brand = getAgentBranding(step);
          
          if (stepData.status === 'idle' && !stepData.content) return null;

          return (
            <div
              key={step}
              className={`p-4 rounded-xl border-l-4 flex-none glass-panel transition-all duration-300 ${brand.color} ${
                stepData.status === 'thinking' ? 'animate-pulse' : ''
              } ${stepData.status === 'streaming' ? 'ring-1 ring-offset-1 ring-offset-slate-950 ring-indigo-500/30' : ''}`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {stepData.status === 'streaming' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      stepData.status === 'done' ? 'bg-green-500' :
                      stepData.status === 'streaming' ? 'bg-sky-400' :
                      stepData.status === 'thinking' ? 'bg-yellow-500 animate-pulse' :
                      'bg-slate-500'
                    }`}></span>
                  </span>
                  <h4 className="font-semibold text-xs tracking-wide uppercase">{brand.title}</h4>
                </div>
                
                {stepData.metrics && (
                  <span className="text-[10px] text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full font-mono">
                    TTFT: {stepData.metrics.ttft}ms | {stepData.metrics.tokensPerSec.toFixed(0)} t/s
                  </span>
                )}
              </div>

              {stepData.status === 'thinking' && !stepData.content && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2 italic">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Thinking and analyzing...
                </div>
              )}

              {stepData.content && (
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[140px] overflow-y-auto bg-slate-950/40 p-2 rounded-lg scrollbar-thin">
                  {stepData.content}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  // Compile overall stats
  const getOverallStats = (swarm, finalTime) => {
    const steps = ['pm', 'designer', 'developer', 'qa', 'polish'];
    let totalTokens = 0;
    let sumTps = 0;
    let stepsCompleted = 0;
    let minTtft = Infinity;

    steps.forEach(step => {
      const metrics = swarm[step].metrics;
      if (metrics) {
        totalTokens += metrics.tokens;
        sumTps += metrics.tokensPerSec;
        stepsCompleted++;
        if (metrics.ttft < minTtft) minTtft = metrics.ttft;
      }
    });

    const avgTps = stepsCompleted > 0 ? (sumTps / stepsCompleted) : 0;
    return {
      totalTokens,
      avgTps,
      ttft: minTtft === Infinity ? 0 : minTtft,
      time: finalTime || 0
    };
  };

  const cStats = getOverallStats(cerebrasSwarm, cerebrasFinishedTime || cerebrasTimer);
  const oStats = getOverallStats(ollamaSwarm, ollamaFinishedTime || ollamaTimer);
  const speedRatio = oStats.time > 0 && cStats.time > 0 ? (oStats.time / cStats.time).toFixed(1) : null;
  const tpsRatio = cStats.avgTps > 0 && oStats.avgTps > 0 ? (cStats.avgTps / oStats.avgTps).toFixed(1) : null;

  const currentPreviewCode = activeTab === 'cerebras' ? cerebrasSwarm.finalCode : ollamaSwarm.finalCode;

  const getSharpnessColor = () => {
    if (sharpness > threshold) return 'bg-emerald-500';
    if (sharpness > threshold * 0.7) return 'bg-yellow-500';
    return 'bg-rose-500';
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* SHUTTER FLASH SCREEN */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-[999] opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      )}

      {/* HEADER */}
      <header className="glass-panel border-b border-slate-800 py-3 px-6 flex-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-rose-500 to-indigo-600 p-2 rounded-xl text-white shadow-lg animate-pulse-fast">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                DevSwarm <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30">Cerebras Gemma 4 Hackathon</span>
              </h1>
              <p className="text-[10px] text-slate-400">Collaborative agent teams design & compile UI code at 1,500+ tokens/sec</p>
            </div>
          </div>

          {/* Quick Timers */}
          {isRunning && (
            <div className="flex items-center gap-3 bg-slate-900/60 px-3 py-1 rounded-xl border border-slate-800 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-slate-400">Cerebras:</span>
                <span className="font-mono text-white font-bold">{cerebrasTimer.toFixed(1)}s</span>
              </div>
              <div className="h-3 w-px bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
                <span className="text-slate-400">Ollama:</span>
                <span className="font-mono text-white font-bold">{ollamaTimer.toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT LAYOUT */}
      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1 overflow-hidden w-full">
        
        {/* LEFT COLUMN: SCANNER & CONFIGS (Self Scrolling) */}
        <section className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto h-full pr-1 scrollbar-thin pb-4">
          
          {/* Uploader / Camera Scanner */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col flex-none relative">
            <div className="flex border border-slate-800 rounded-lg p-0.5 mb-3 text-[10px] font-semibold bg-slate-950/60">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  inputMode === 'upload' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="h-3 w-3" /> File Upload
              </button>
              <button
                onClick={() => setInputMode('webcam')}
                className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  inputMode === 'webcam' ? 'bg-indigo-600 text-white font-bold animate-pulse' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="h-3 w-3" /> Live Camera
              </button>
            </div>

            {inputMode === 'upload' ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[140px] ${
                  image ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/20'
                }`}
              >
                {image ? (
                  <div className="relative w-full group">
                    <img
                      src={`data:image/png;base64,${image}`}
                      alt="Upload Preview"
                      className="max-h-[110px] mx-auto rounded-lg shadow-md border border-slate-800"
                    />
                    <div className="mt-2 text-[10px] font-semibold text-indigo-400 truncate">{imageName}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setImageName('');
                      }}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer w-full py-2 flex flex-col items-center">
                    <Upload className="h-6 w-6 text-slate-500 mb-1" />
                    <span className="text-[10px] text-slate-300 font-semibold mb-0.5">Drag & Drop Wireframe</span>
                    <span className="text-[9px] text-slate-500">or browse files</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${mirrorVideo ? 'scale-x-[-1]' : ''}`}
                    playsInline
                    muted
                  />
                  
                  <div className="absolute inset-0 border border-indigo-500/10 pointer-events-none">
                    <div className="w-full h-0.5 bg-indigo-500/40 absolute top-0 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[bounce_3s_infinite_linear]"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-16 border border-dashed border-emerald-500/30 rounded flex items-center justify-center">
                      <div className="text-[6px] text-emerald-400/40 uppercase tracking-widest font-mono">Target Box</div>
                    </div>
                  </div>

                  {webcamError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-rose-400 bg-slate-950 p-2 text-center">
                      <AlertCircle className="h-5 w-5 mb-1 text-rose-500" />
                      <span className="font-semibold mb-0.5">Camera failed to start</span>
                      <span className="text-[8px] text-slate-500 max-w-[170px] leading-tight">
                        Default device offline. Please select your Elgato Mark II in the dropdown below.
                      </span>
                    </div>
                  ) : !webcamActive ? (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 bg-slate-950">
                      <RefreshCw className="h-3 w-3 animate-spin mr-2.5" /> Starting camera...
                    </div>
                  ) : null}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {devices.length > 0 && (
                  <div className="flex flex-col gap-0.5 text-[9px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                    <label className="font-semibold text-slate-500">Camera Source:</label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        const newDeviceId = e.target.value;
                        setSelectedDeviceId(newDeviceId);
                        stopWebcam();
                        startWebcam(newDeviceId);
                      }}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {devices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera (${device.deviceId.slice(0, 6)}...)`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-xl border border-slate-900 text-[10px]">
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Gauge className="h-2.5 w-2.5 text-indigo-400" /> Focus level:
                    </span>
                    <span className="font-mono text-slate-200">{sharpness.toFixed(1)} / {threshold}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${getSharpnessColor()}`}
                      style={{ width: `${Math.min((sharpness / threshold) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1.5 text-[9px] text-slate-500 border-t border-slate-900 pt-1.5">
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSnap}
                          onChange={(e) => setAutoSnap(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Auto-snap focus
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mirrorVideo}
                          onChange={(e) => setMirrorVideo(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Flip Horizontal
                      </label>
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span>Threshold:</span>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-24 accent-indigo-500 cursor-ew-resize bg-slate-800 h-1 rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={snapPhoto}
                    disabled={!webcamActive}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Camera className="h-3 w-3" /> Capture
                  </button>
                  <button
                    onClick={() => setInputMode('upload')}
                    className="py-1.5 px-3 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Config Controls */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3 flex-none">
            <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-300 flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-indigo-400" /> Settings
            </h3>

            {/* Cerebras Key */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium flex justify-between">
                <span>Cerebras API Key</span>
                <a href="https://cloud.cerebras.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline flex items-center gap-0.5">
                  Get Key <ExternalLink className="h-2 w-2" />
                </a>
              </label>
              <input
                type="password"
                placeholder="csk-..."
                value={cerebrasApiKey}
                onChange={(e) => setCerebrasApiKey(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <label className="flex items-center gap-1 text-[9px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveKey}
                  onChange={(e) => setSaveKey(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                Remember key
              </label>
            </div>

            {/* Reasoning Toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Reasoning mode</label>
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="none">Off (Max Speed)</option>
                <option value="low">Low (Fast)</option>
                <option value="medium">Medium</option>
                <option value="high">High (Deep)</option>
              </select>
            </div>

            <div className="h-px bg-slate-800/40"></div>

            {/* Ollama URL */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Local Ollama URL</label>
              <input
                type="text"
                placeholder="http://localhost:11434/v1"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Ollama Model */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Local Model Name</label>
              <input
                type="text"
                placeholder="gemma4"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Compile button */}
            <button
              onClick={() => triggerSwarmStart(null)}
              disabled={!image || isRunning || inputMode === 'webcam'}
              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                !image || inputMode === 'webcam'
                  ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                  : isRunning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-lg active:scale-95'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Compiling...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" /> Compile Swarm
                </>
              )}
            </button>
          </div>
        </section>

        {/* MIDDLE COLUMN: REAL-TIME AGENT CHATS (Locked height, local scrolling) */}
        <section className="lg:col-span-5 flex flex-col overflow-hidden h-full">
          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden h-full pb-4">
            
            {/* Cerebras Stream Column */}
            <div className="glass-panel rounded-2xl p-4 flex flex-col border-t-2 border-t-rose-500/80 h-full overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3 flex-none">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white leading-tight">Cerebras Cloud</h3>
                    <p className="text-[9px] text-rose-400 font-semibold font-mono leading-none">gemma-4-31b</p>
                  </div>
                </div>
                {cerebrasSwarm.error && <AlertCircle className="h-4 w-4 text-red-500" title={cerebrasSwarm.error} />}
              </div>

              {renderAgentTimeline(cerebrasSwarm, cerebrasScrollRef, true)}
              
              {!isRunning && !cerebrasSwarm.pm.content && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-4">
                  <Bot className="h-8 w-8 mb-1.5 opacity-25" />
                  <p className="text-[10px]">Cerebras stream timeline</p>
                </div>
              )}
            </div>

            {/* Ollama Stream Column */}
            <div className="glass-panel rounded-2xl p-4 flex flex-col border-t-2 border-t-blue-500/80 h-full overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-3 flex-none">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white leading-tight">Local Ollama</h3>
                    <p className="text-[9px] text-blue-400 font-semibold font-mono leading-none">{ollamaModel}</p>
                  </div>
                </div>
                {ollamaSwarm.error && <AlertCircle className="h-4 w-4 text-red-500" title={ollamaSwarm.error} />}
              </div>

              {renderAgentTimeline(ollamaSwarm, ollamaScrollRef, false)}

              {!isRunning && !ollamaSwarm.pm.content && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center p-4">
                  <Bot className="h-8 w-8 mb-1.5 opacity-25" />
                  <p className="text-[10px]">Local GPU stream timeline</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: PREVIEW & CODE INSPECTOR (Locked height) */}
        <section className="lg:col-span-4 flex flex-col overflow-hidden h-full pb-4">
          <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col overflow-hidden h-full">
            {/* Header Tabs */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3 flex-none">
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-slate-800 text-[9px] font-semibold">
                <button
                  onClick={() => setActiveTab('cerebras')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeTab === 'cerebras' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/15' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cerebras
                </button>
                <button
                  onClick={() => setActiveTab('ollama')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeTab === 'ollama' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/15' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Local GPU
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setPreviewTab('preview')}
                  className={`p-1 rounded-lg border transition-all ${
                    previewTab === 'preview' ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  title="Live Preview"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewTab('code')}
                  className={`p-1 rounded-lg border transition-all ${
                    previewTab === 'code' ? 'border-indigo-500/30 bg-indigo-950/20 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  title="Source Code"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                {currentPreviewCode && (
                  <button
                    onClick={() => copyToClipboard(currentPreviewCode)}
                    className="p-1 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-900/60"
                    title="Copy Code"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Preview Area (Self scrolling) */}
            <div className="flex-1 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-900 relative flex flex-col h-full">
              {currentPreviewCode ? (
                previewTab === 'preview' ? (
                  <iframe
                    title="UI Live Preview"
                    srcDoc={currentPreviewCode}
                    className="w-full flex-1 bg-white border-none"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <pre className="p-3 text-[9px] text-slate-300 font-mono overflow-auto flex-1 h-full scrollbar-thin">
                    <code>{currentPreviewCode}</code>
                  </pre>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-4 text-center">
                  <Code className="h-8 w-8 mb-1 opacity-20" />
                  <p className="text-[10px] leading-tight">Live app preview renders here after swarm dev finishes compilation</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* METRICS DASHBOARD (Fixed bottom bar) */}
      <footer className="flex-none mt-2 max-w-7xl mx-auto px-6 w-full pb-4">
        <div className="glass-panel rounded-2xl p-4 border-t border-indigo-500/25 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-1.5 flex-none">
            <Gauge className="h-4 w-4 text-indigo-400" />
            <h2 className="font-bold text-xs tracking-wide uppercase text-slate-300">Latency Dashboard</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full max-w-4xl">
            {/* TTFT Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">TTFT</span>
              <div className="flex justify-between items-baseline mt-1">
                <div>
                  <div className="text-sm font-bold text-slate-100 font-mono">{cStats.ttft.toFixed(0)}<span className="text-[9px] font-normal text-slate-400">ms</span></div>
                  <div className="text-[8px] text-slate-500">Cerebras</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-400 font-mono">{oStats.ttft.toFixed(0)}<span className="text-[9px] font-normal text-slate-500">ms</span></div>
                  <div className="text-[8px] text-slate-500">Local</div>
                </div>
              </div>
            </div>

            {/* Speed Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">Speed</span>
              <div className="flex justify-between items-baseline mt-1">
                <div>
                  <div className="text-sm font-bold text-rose-400 font-mono">{cStats.avgTps.toFixed(0)}<span className="text-[9px] font-normal text-rose-500/80"> t/s</span></div>
                  <div className="text-[8px] text-slate-500">Cerebras</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-400 font-mono">{oStats.avgTps.toFixed(0)}<span className="text-[9px] font-normal text-blue-500/80"> t/s</span></div>
                  <div className="text-[8px] text-slate-500">Local</div>
                </div>
              </div>
            </div>

            {/* Total Duration Card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">Total Time</span>
              <div className="flex justify-between items-baseline mt-1">
                <div>
                  <div className="text-sm font-bold text-slate-100 font-mono">{cStats.time.toFixed(1)}<span className="text-[9px] font-normal text-slate-400">s</span></div>
                  <div className="text-[8px] text-slate-500">Cerebras</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-400 font-mono">{oStats.time.toFixed(1)}<span className="text-[9px] font-normal text-slate-500">s</span></div>
                  <div className="text-[8px] text-slate-500">Local</div>
                </div>
              </div>
            </div>

            {/* Hero Winner Banner */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border border-indigo-500/20 rounded-xl p-2 flex flex-col justify-center items-center text-center">
              {speedRatio ? (
                <>
                  <div className="text-[9px] font-extrabold bg-gradient-to-r from-rose-400 to-indigo-400 bg-clip-text text-transparent leading-none">
                    {speedRatio}x Faster
                  </div>
                  <p className="text-[7px] text-slate-500 mt-1">Cerebras: {cStats.time.toFixed(1)}s vs Local: {oStats.time.toFixed(1)}s</p>
                </>
              ) : (
                <div className="text-[8px] text-slate-500">
                  Awaiting Swarm Run
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
