import React, { useState, useEffect, useRef } from 'react';
import { usePDFStore } from '../../store/pdfStore';
import { TtsEngine } from '../../core/ttsEngine';
import type { SpeechState } from '../../core/ttsEngine';
import { 
  X, 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Gauge, 
  Sliders, 
  FileText
} from 'lucide-react';

export const TtsReaderModal: React.FC = () => {
  const { activeModal, setActiveModal, pdfDocProxy, pageDimensions, currentPage } = usePDFStore();
  
  const engineRef = useRef<TtsEngine | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [readScope, setReadScope] = useState<'current' | 'all'>('current');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    isPaused: false,
    currentSentenceIndex: 0,
    currentWordIndex: 0,
    sentences: [],
    currentText: ''
  });

  const activeSentenceRef = useRef<HTMLParagraphElement | null>(null);

  // Initialize TTS Engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new TtsEngine();
      engineRef.current.setOnStateChange((updated) => {
        setSpeechState((prev) => ({ ...prev, ...updated }));
      });
    }

    const timer = setTimeout(() => {
      if (engineRef.current) {
        const v = engineRef.current.getVoices();
        setVoices(v);
        if (v.length > 0 && !selectedVoiceName) {
          const pref = v.find((x) => x.lang.startsWith('en')) || v[0];
          setSelectedVoiceName(pref.name);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      engineRef.current?.stop();
    };
  }, []);

  // Extract text from PDF document when modal opens or scope changes
  useEffect(() => {
    if (activeModal !== 'ttsReader' || !pdfDocProxy) return;

    let isMounted = true;
    async function extractText() {
      setIsExtracting(true);
      try {
        let fullText = '';
        if (readScope === 'current') {
          const page = await pdfDocProxy!.getPage(currentPage || 1);
          const textContent = await page.getTextContent();
          fullText = textContent.items.map((item: any) => item.str).join(' ');
        } else {
          for (let i = 1; i <= pdfDocProxy!.numPages; i++) {
            const page = await pdfDocProxy!.getPage(i);
            const textContent = await page.getTextContent();
            fullText += `\n[Page ${i}]\n` + textContent.items.map((item: any) => item.str).join(' ');
          }
        }

        if (isMounted && engineRef.current) {
          engineRef.current.loadText(fullText);
        }
      } catch (err) {
        console.error('Text extraction failed:', err);
      } finally {
        if (isMounted) setIsExtracting(false);
      }
    }

    extractText();
    return () => { isMounted = false; };
  }, [activeModal, pdfDocProxy, currentPage, readScope]);

  // Auto-scroll to active sentence
  useEffect(() => {
    activeSentenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [speechState.currentSentenceIndex]);

  if (activeModal !== 'ttsReader') return null;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedVoiceName(name);
    engineRef.current?.setVoice(name);
  };

  const handleSpeedChange = (val: number) => {
    setSpeed(val);
    engineRef.current?.setSpeed(val);
  };

  const handlePitchChange = (val: number) => {
    setPitch(val);
    engineRef.current?.setPitch(val);
  };

  const handlePlayPause = () => {
    if (speechState.isPlaying && !speechState.isPaused) {
      engineRef.current?.pause();
    } else if (speechState.isPaused) {
      engineRef.current?.resume();
    } else {
      engineRef.current?.play(speechState.currentSentenceIndex);
    }
  };

  const handleStop = () => {
    engineRef.current?.stop();
  };

  const handleNext = () => {
    engineRef.current?.nextSentence();
  };

  const handlePrev = () => {
    engineRef.current?.prevSentence();
  };

  const handleSentenceClick = (idx: number) => {
    engineRef.current?.play(idx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Natural Voice Document Reader (TTS)</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">High-fidelity text-to-speech with live karaoke word-tracking</p>
            </div>
          </div>
          <button
            onClick={() => {
              engineRef.current?.stop();
              setActiveModal(null);
            }}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls Column */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Scope Toggle */}
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-1">
              <button
                onClick={() => setReadScope('current')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  readScope === 'current'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Current Page ({currentPage || 1})
              </button>
              <button
                onClick={() => setReadScope('all')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  readScope === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Entire Document ({pageDimensions?.length || 1} pgs)
              </button>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Synthesizer Voice
              </label>
              <select
                value={selectedVoiceName}
                onChange={handleVoiceChange}
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              >
                {voices.map((v, i) => (
                  <option key={`${v.name}-${i}`} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders: Speed & Pitch */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Gauge className="w-3.5 h-3.5 text-blue-500" /> Reading Speed
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => handleSpeedChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Sliders className="w-3.5 h-3.5 text-purple-500" /> Pitch / Tone
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-mono">{pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => handlePitchChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Transport Controls */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center justify-center gap-4">
              <button
                onClick={handlePrev}
                disabled={speechState.currentSentenceIndex === 0}
                className="p-2.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Previous Sentence"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={handlePlayPause}
                disabled={isExtracting || speechState.sentences.length === 0}
                className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 active:scale-95"
                title={speechState.isPlaying && !speechState.isPaused ? 'Pause' : 'Play'}
              >
                {speechState.isPlaying && !speechState.isPaused ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </button>

              <button
                onClick={handleNext}
                disabled={speechState.currentSentenceIndex >= speechState.sentences.length - 1}
                className="p-2.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Next Sentence"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={handleStop}
                disabled={!speechState.isPlaying}
                className="p-2.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 text-rose-500 transition-colors"
                title="Stop Audio"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Text Display Column */}
          <div className="md:col-span-7 flex flex-col bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Synchronized Sentence Stream
              </span>
              <span>
                {speechState.sentences.length > 0 ? (
                  `${speechState.currentSentenceIndex + 1} / ${speechState.sentences.length}`
                ) : (
                  '0 sentences'
                )}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-3 max-h-[380px]">
              {isExtracting ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-zinc-400">Extracting document speech text...</span>
                </div>
              ) : speechState.sentences.length === 0 ? (
                <div className="text-center text-xs text-zinc-400 py-16">
                  No readable text extracted from this page.
                </div>
              ) : (
                speechState.sentences.map((sentence, idx) => {
                  const isActive = idx === speechState.currentSentenceIndex;
                  return (
                    <p
                      key={idx}
                      ref={isActive ? activeSentenceRef : null}
                      onClick={() => handleSentenceClick(idx)}
                      className={`p-2.5 rounded-xl text-xs sm:text-sm leading-relaxed cursor-pointer transition-all ${
                        isActive
                          ? 'bg-blue-500/15 border border-blue-500/30 text-blue-900 dark:text-blue-100 font-medium shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      {sentence}
                    </p>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
