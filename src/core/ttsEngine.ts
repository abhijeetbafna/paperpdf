export interface SpeechState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  currentWordIndex: number;
  sentences: string[];
  currentText: string;
}

export class TtsEngine {
  private synth: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private onStateChangeCallback: ((state: Partial<SpeechState>) => void) | null = null;
  private sentences: string[] = [];
  private currentSentenceIndex = 0;
  private currentSpeed = 1.0;
  private currentPitch = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (!this.selectedVoice && this.voices.length > 0) {
      // Prefer English or default system voice
      this.selectedVoice = this.voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) 
        || this.voices.find(v => v.lang.startsWith('en')) 
        || this.voices[0];
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public setVoice(voiceName: string) {
    const found = this.voices.find(v => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public setSpeed(speed: number) {
    this.currentSpeed = Math.max(0.5, Math.min(2.5, speed));
    if (this.utterance) {
      this.utterance.rate = this.currentSpeed;
    }
  }

  public setPitch(pitch: number) {
    this.currentPitch = Math.max(0.5, Math.min(1.5, pitch));
  }

  public setOnStateChange(cb: (state: Partial<SpeechState>) => void) {
    this.onStateChangeCallback = cb;
  }

  public loadText(text: string) {
    this.stop();
    // Split text into meaningful sentences
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) {
      this.sentences = [];
      return;
    }
    // Regex split by sentence terminators
    this.sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
    this.sentences = this.sentences.map(s => s.trim()).filter(Boolean);
    this.currentSentenceIndex = 0;
    
    this.onStateChangeCallback?.({
      sentences: this.sentences,
      currentSentenceIndex: 0,
      currentWordIndex: 0,
      isPlaying: false,
      isPaused: false,
      currentText: this.sentences[0] || ''
    });
  }

  public play(startIndex?: number) {
    if (!this.synth) return;
    if (this.sentences.length === 0) return;

    if (startIndex !== undefined) {
      this.currentSentenceIndex = Math.max(0, Math.min(this.sentences.length - 1, startIndex));
    }

    this.speakCurrentSentence();
  }

  private speakCurrentSentence() {
    if (!this.synth) return;
    this.synth.cancel();

    if (this.currentSentenceIndex >= this.sentences.length) {
      this.onStateChangeCallback?.({
        isPlaying: false,
        isPaused: false,
        currentSentenceIndex: 0,
        currentWordIndex: 0
      });
      return;
    }

    const sentence = this.sentences[this.currentSentenceIndex];
    this.utterance = new SpeechSynthesisUtterance(sentence);
    if (this.selectedVoice) this.utterance.voice = this.selectedVoice;
    this.utterance.rate = this.currentSpeed;
    this.utterance.pitch = this.currentPitch;

    this.utterance.onboundary = (event) => {
      if (event.name === 'word') {
        this.onStateChangeCallback?.({
          currentWordIndex: event.charIndex
        });
      }
    };

    this.utterance.onend = () => {
      this.currentSentenceIndex++;
      if (this.currentSentenceIndex < this.sentences.length) {
        this.speakCurrentSentence();
      } else {
        this.onStateChangeCallback?.({
          isPlaying: false,
          isPaused: false,
          currentSentenceIndex: 0,
          currentWordIndex: 0
        });
      }
    };

    this.utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.onStateChangeCallback?.({
        isPlaying: false,
        isPaused: false
      });
    };

    this.synth.speak(this.utterance);
    this.onStateChangeCallback?.({
      isPlaying: true,
      isPaused: false,
      currentSentenceIndex: this.currentSentenceIndex,
      currentText: sentence
    });
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.onStateChangeCallback?.({
        isPlaying: true,
        isPaused: true
      });
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.onStateChangeCallback?.({
        isPlaying: true,
        isPaused: false
      });
    } else {
      this.play(this.currentSentenceIndex);
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.onStateChangeCallback?.({
      isPlaying: false,
      isPaused: false,
      currentWordIndex: 0
    });
  }

  public nextSentence() {
    if (this.currentSentenceIndex < this.sentences.length - 1) {
      this.currentSentenceIndex++;
      this.speakCurrentSentence();
    }
  }

  public prevSentence() {
    if (this.currentSentenceIndex > 0) {
      this.currentSentenceIndex--;
      this.speakCurrentSentence();
    }
  }
}
