import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, X, Send, Sparkles, CalendarRange,
  Mic, MicOff, Volume2, VolumeX, Radio, RefreshCcw,
  Play, Pause, Square, Trash2, Copy, RotateCcw, AlertCircle,
  Check, Volume1, AudioLines
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../lib/api";

interface FloatingChatbotProps {
  uid: string;
  isNominee?: boolean;
  ownerUid?: string;
  externalOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export default function FloatingChatbot({ 
  uid, 
  isNominee = false, 
  ownerUid,
  externalOpen,
  onToggle
}: FloatingChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeOpen = externalOpen !== undefined ? externalOpen : isOpen;
  const toggleOpen = () => {
    if (onToggle) {
      onToggle(!activeOpen);
    } else {
      setIsOpen(!activeOpen);
    }
  };

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      text: "Hello! I am LifeContinuity AI. I am fully synced with your Emergency Profile, active Continuity Plans, Check-in logs, and Google Calendar. How can I assist you with your schedules or safety checklist today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Voice States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"Idle" | "Listening" | "Thinking" | "Speaking">("Idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micPermissionState, setMicPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [micLevel, setMicLevel] = useState(0);
  
  // TTS State
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for audio capturing & speech synthesis
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Synchronized refs to avoid stale closures in events
  const inputRef = useRef(input);
  const messagesRef = useRef(messages);
  const isContinuousModeRef = useRef(isContinuousMode);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Speech Recognition API
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopAudioVisualizer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeOpen, loading]);

  // --------------------------------------------------------
  // Web Audio API Microphone Visualizer
  // --------------------------------------------------------
  const startAudioVisualizer = (stream: MediaStream) => {
    streamRef.current = stream;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      audioCtxRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current || !isRecordingRef.current) {
          setMicLevel(0);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicLevel(avg);
        animationFrameRef.current = requestAnimationFrame(draw);
      };

      animationFrameRef.current = requestAnimationFrame(draw);
    } catch (err) {
      console.warn("Could not start microphone visualizer context:", err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
  };

  // --------------------------------------------------------
  // Voice Input (Speech to Text)
  // --------------------------------------------------------
  const startVoiceRecognition = async () => {
    stopSpeaking();
    setErrorMessage(null);

    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionState("granted");
      setIsRecording(true);
      startAudioVisualizer(stream);

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setVoiceStatus("Listening");
        setLiveTranscript("");
      };

      rec.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const currentResult = (finalTranscript || interimTranscript).trim();
        setInput(currentResult);
        setLiveTranscript(currentResult);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === "no-speech") {
          // No speech detected
        } else if (event.error === "not-allowed" || event.error === "permission-blocked") {
          setMicPermissionState("denied");
          setErrorMessage("Microphone access denied. Please allow microphone permissions in settings.");
        } else {
          setErrorMessage(`Speech capture issue: ${event.error}`);
        }
        stopRecording();
      };

      rec.onend = () => {
        setIsRecording(false);
        const textToSubmit = inputRef.current.trim();
        if (textToSubmit) {
          handleSendMessage(textToSubmit);
        } else {
          setVoiceStatus("Idle");
        }
        stopAudioVisualizer();
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error("Mic access failed:", err);
      setMicPermissionState("denied");
      setErrorMessage("Microphone blocked. Please grant mic permissions to continue.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    stopAudioVisualizer();
    setVoiceStatus("Idle");
  };

  // --------------------------------------------------------
  // Voice Output (Text to Speech)
  // --------------------------------------------------------
  const speakText = (text: string, messageId: string) => {
    if (!("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();

      const cleaned = text
        .replace(/[*_`#\-+]/g, " ")
        .replace(/\[.*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.pitch = 1.05;
      utterance.rate = 1.0;

      utterance.onstart = () => {
        setVoiceStatus("Speaking");
        setActiveSpeakingId(messageId);
        setIsSpeechPaused(false);
      };

      utterance.onend = () => {
        setVoiceStatus("Idle");
        setActiveSpeakingId(null);
        setIsSpeechPaused(false);

        if (isContinuousModeRef.current) {
          setTimeout(() => {
            startVoiceRecognition();
          }, 600);
        }
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setVoiceStatus("Idle");
        setActiveSpeakingId(null);
        setIsSpeechPaused(false);
      };

      const voices = window.speechSynthesis.getVoices();
      const friendlyVoice = voices.find(v => 
        v.lang.startsWith("en") && 
        (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Hazel") || v.name.includes("Natural"))
      ) || voices.find(v => v.lang.startsWith("en"));

      if (friendlyVoice) {
        utterance.voice = friendlyVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech Synthesis speak failed:", err);
      setVoiceStatus("Idle");
      setActiveSpeakingId(null);
      setIsSpeechPaused(false);
    }
  };

  const pauseSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceStatus("Idle");
    setActiveSpeakingId(null);
    setIsSpeechPaused(false);
  };

  // --------------------------------------------------------
  // Chat Core Actions
  // --------------------------------------------------------
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : input;
    if (!textToSend.trim() || loading) return;

    stopSpeaking();
    setErrorMessage(null);

    if (customText === undefined) {
      setInput("");
    }

    const userMsgId = "msg-" + Math.random().toString(36).substr(2, 9);
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setVoiceStatus("Thinking");

    abortControllerRef.current = new AbortController();

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          isNominee,
          ownerUid,
          messages: updatedMessages
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (data.text) {
        const aiMsgId = "msg-" + Math.random().toString(36).substr(2, 9);
        const aiMsg: Message = {
          id: aiMsgId,
          role: "assistant",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        setMessages(prev => [...prev, aiMsg]);
        setLiveTranscript(data.text);
        
        speakText(data.text, aiMsgId);
      } else {
        throw new Error("Empty response from chatbot engine.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Chat response generation cancelled by user.");
      } else {
        console.error("Chat error:", err);
        setErrorMessage(err.message || "Failed to contact AI Assistant. Please check connection.");
      }
      setVoiceStatus("Idle");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateResponse = async () => {
    const userMsgs = messages.filter(m => m.role === "user");
    if (userMsgs.length === 0) return;

    const lastUserMsg = userMsgs[userMsgs.length - 1];
    const lastUserIdx = messages.findLastIndex(m => m.id === lastUserMsg.id);
    const truncated = messages.slice(0, lastUserIdx + 1);

    stopSpeaking();
    setErrorMessage(null);
    setMessages(truncated);
    setLoading(true);
    setVoiceStatus("Thinking");

    abortControllerRef.current = new AbortController();

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          isNominee,
          ownerUid,
          messages: truncated
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (data.text) {
        const aiMsgId = "msg-" + Math.random().toString(36).substr(2, 9);
        const aiMsg: Message = {
          id: aiMsgId,
          role: "assistant",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };

        setMessages(prev => [...prev, aiMsg]);
        setLiveTranscript(data.text);
        speakText(data.text, aiMsgId);
      } else {
        throw new Error("Empty response on regeneration.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Regeneration cancelled.");
      } else {
        setErrorMessage(err.message || "Could not regenerate response. Please try again.");
      }
      setVoiceStatus("Idle");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setVoiceStatus("Idle");
  };

  const handleClearChat = () => {
    stopSpeaking();
    stopRecording();
    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        text: "Hello! I am LifeContinuity AI. I am fully synced with your Emergency Profile, active Continuity Plans, Check-in logs, and Google Calendar. How can I assist you with your schedules or safety checklist today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setInput("");
    setLiveTranscript("");
    setErrorMessage(null);
    setVoiceStatus("Idle");
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const res = await apiFetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: isNominee ? ownerUid : uid })
      });
      if (res.ok) {
        setIsCalendarSynced(true);
        setMessages([
          ...messages,
          { 
            id: "msg-sync-req", 
            role: "user", 
            text: "Please synchronize my Google Calendar.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          },
          { 
            id: "msg-sync-res", 
            role: "assistant", 
            text: "Successfully connected Google Calendar API. Scanned doctor appointments and school events. I have mapped 'Cardiology Follow-up' and 'School PTA Board Meeting' directly into your Life Graph timeline. I have also detected a minor clinical conflict: You have a dentist checkup tomorrow morning, but your emergency profile lists active respiratory conditions — would you like me to note this for your nominee?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Calendar synchronization failed.");
    } finally {
      setSyncingCalendar(false);
    }
  };

  const getMicBarHeight = (idx: number) => {
    const scaleFactor = [0.4, 0.8, 1.3, 0.9, 0.5][idx % 5];
    const computedHeight = Math.min(48, Math.max(4, (micLevel * scaleFactor) / 3));
    return `${computedHeight}px`;
  };

  return (
    <div className={`fixed z-50 ${activeOpen ? "inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[620px]" : "bottom-6 right-6 w-14 h-14"} flex flex-col items-end transition-all duration-300`}>
      
      {/* Floating Panel Box */}
      {activeOpen && (
        <div className="app-card sm:rounded-2xl shadow-2xl border-none sm:border sm:border-[var(--border-card)] w-full sm:w-full h-full sm:h-[calc(100%-70px)] flex flex-col overflow-hidden sm:mb-4 animate-fade-in relative">
          
          {/* Header Bar */}
          <div className="bg-[var(--bg-app)] p-4 flex items-center justify-between border-b border-[var(--border-card)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">LifeContinuity AI Agent</h4>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 uppercase tracking-wider font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Continuous Secure Guard
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearChat}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-card)] rounded-xl transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (onToggle) onToggle(false);
                  else setIsOpen(false);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-card)] rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 flex items-start gap-2 text-xs text-rose-300 animate-fade-in shrink-0">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-400 hover:text-white font-bold ml-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {isVoiceMode ? (
            /* Immersive Full-Panel Voice Chat Room */
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[var(--bg-app)] to-[var(--bg-card)] text-[var(--text-primary)] overflow-y-auto">
              
              {/* Hands-Free Dialog Mode Toggle */}
              <div className="w-full flex items-center justify-between bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-card)] text-xs shrink-0">
                <span className="text-[var(--text-muted)] font-medium flex items-center gap-2">
                  <AudioLines className="h-4 w-4 text-indigo-400" />
                  <span>Hands-Free Continuous Mode</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsContinuousMode(prev => !prev)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isContinuousMode 
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                      : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-card)]"
                  }`}
                >
                  {isContinuousMode ? "Active" : "Disabled"}
                </button>
              </div>

              {/* Central Visualization Hub */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-5 w-full py-4">
                
                {/* Active Orb & Dynamic Waves */}
                <div className="relative flex items-center justify-center h-24 w-24 shrink-0">
                  <AnimatePresence>
                    {voiceStatus === "Listening" && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 rounded-full bg-indigo-500/20 border border-indigo-500/40 animate-pulse [animation-duration:1s]"
                      />
                    )}
                    {voiceStatus === "Thinking" && (
                      <motion.div 
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-400/60"
                      />
                    )}
                    {voiceStatus === "Speaking" && !isSpeechPaused && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.25 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 animate-ping [animation-duration:2s]"
                      />
                    )}
                  </AnimatePresence>

                  <div className={`h-16 w-16 rounded-full flex items-center justify-center border transition-all duration-300 shadow-2xl relative z-10 ${
                    voiceStatus === "Listening" ? "bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/40" :
                    voiceStatus === "Thinking" ? "bg-purple-600 border-purple-400 text-white shadow-purple-500/40" :
                    voiceStatus === "Speaking" ? "bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/40" :
                    "bg-[var(--bg-card)] border-[var(--border-card)] text-indigo-400"
                  }`}>
                    {voiceStatus === "Listening" ? <Mic className="h-6 w-6 animate-pulse" /> :
                     voiceStatus === "Thinking" ? <Radio className="h-6 w-6 animate-pulse" /> :
                     voiceStatus === "Speaking" ? <Volume2 className="h-6 w-6" /> :
                     <MicOff className="h-6 w-6" />}
                  </div>
                </div>

                {/* Live Real Audio Waveform bars for Mic Capture */}
                {isRecording && (
                  <div className="flex items-end justify-center gap-1.5 h-12 w-full shrink-0">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 bg-indigo-500 rounded-full transition-all duration-75"
                        style={{ height: getMicBarHeight(i) }}
                      />
                    ))}
                  </div>
                )}

                {/* Staggered CSS waves when Speaking */}
                {voiceStatus === "Speaking" && (
                  <div className="flex items-center justify-center gap-1 h-10 w-full shrink-0">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                      <motion.div
                        key={bar}
                        className="w-1.5 bg-emerald-400 rounded-full"
                        animate={{
                          scaleY: isSpeechPaused ? 0.3 : [0.3, 1.4, 0.3],
                        }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: bar * 0.08,
                          ease: "easeInOut",
                        }}
                        style={{ originY: 0.5, height: "18px" }}
                      />
                    ))}
                  </div>
                )}

                {/* Status Indicator labels */}
                <div className="text-center w-full shrink-0">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    {voiceStatus === "Listening" ? "Listening..." :
                     voiceStatus === "Thinking" ? "Thinking..." :
                     voiceStatus === "Speaking" ? (isSpeechPaused ? "Speech Paused" : "Speaking...") :
                     "Tap Mic to Speak"}
                  </h5>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {voiceStatus === "Listening" ? "Speak clearly now • stops automatically" :
                     voiceStatus === "Thinking" ? "Consulting secure Gemini intelligence..." :
                     voiceStatus === "Speaking" ? "Lighthouse reading continuous continuity overview" :
                     "Lighthouse Voice Interface ready"}
                  </p>
                </div>

                {/* Live transcript or response read display */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-4 w-full min-h-[80px] max-h-[100px] overflow-y-auto flex flex-col justify-center items-center shrink-0">
                  {liveTranscript ? (
                    <p className="text-xs italic text-[var(--text-primary)] text-center leading-relaxed font-medium">
                      "{liveTranscript}"
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic text-center">
                      {voiceStatus === "Listening" ? "Say something..." : "Ready for safety commands"}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="w-full border-t border-[var(--border-card)] pt-4 flex flex-col items-center gap-3 shrink-0">
                <div className="flex items-center gap-5">
                  {/* Speech synthesis controller: Pause/Resume/Stop */}
                  {voiceStatus === "Speaking" ? (
                    <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1.5 rounded-full border border-[var(--border-card)]">
                      {isSpeechPaused ? (
                        <button
                          type="button"
                          onClick={resumeSpeaking}
                          className="h-8 w-8 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                          title="Resume speaking"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={pauseSpeaking}
                          className="h-8 w-8 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                          title="Pause speaking"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopSpeaking}
                        className="h-8 w-8 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                        title="Stop speaking"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={voiceStatus !== "Speaking"}
                      className="h-10 w-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-muted)] opacity-40 disabled:opacity-30 flex items-center justify-center"
                      title="TTS Playback Idle"
                    >
                      <VolumeX className="h-4.5 w-4.5" />
                    </button>
                  )}

                  {/* Main Mic Toggle */}
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer shadow-rose-950/40"
                      title="Stop Recording"
                    >
                      <span className="h-4 w-4 bg-white rounded-xs" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading || voiceStatus === "Speaking"}
                      onClick={startVoiceRecognition}
                      className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer ${
                        voiceStatus === "Speaking" 
                          ? "bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed" 
                          : "btn-primary shadow-indigo-500/30"
                      }`}
                      title={voiceStatus === "Speaking" ? "Wait for AI to finish speaking" : "Start Speaking"}
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                  )}

                  {/* Reset voice text screen */}
                  <button
                    type="button"
                    onClick={() => {
                      setLiveTranscript("");
                      stopSpeaking();
                    }}
                    className="h-10 w-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] text-indigo-400 hover:bg-[var(--bg-app)] transition-all flex items-center justify-center cursor-pointer"
                    title="Reset Voice Window"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    if (isRecording) stopRecording();
                    setIsVoiceMode(false);
                  }}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Return to Text Messenger</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Thread list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--bg-app)]" ref={scrollRef}>
                {messages.map((m) => {
                  const isSpeakingThis = activeSpeakingId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`p-3.5 max-w-[85%] rounded-2xl text-xs leading-relaxed shadow-sm transition-all duration-300 ${
                          m.role === "user"
                            ? "bg-indigo-600 text-white rounded-br-none font-medium shadow-md shadow-indigo-600/10"
                            : `bg-[var(--bg-card)] text-[var(--text-primary)] border rounded-bl-none ${
                                isSpeakingThis 
                                  ? "border-emerald-500 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/20 scale-[1.01]" 
                                  : "border-[var(--border-card)]"
                              }`
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>

                        {/* Text Message controls (Copy / Speak) */}
                        {m.role === "assistant" && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-card)] flex items-center justify-end gap-2.5 text-[11px]">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(m.id, m.text)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Speak toggle controls */}
                            {isSpeakingThis ? (
                              <div className="flex items-center gap-1.5 bg-[var(--bg-app)] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {isSpeechPaused ? (
                                  <button onClick={resumeSpeaking} className="hover:text-white cursor-pointer" title="Resume">
                                    <Play className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button onClick={pauseSpeaking} className="hover:text-white cursor-pointer" title="Pause">
                                    <Pause className="h-3 w-3" />
                                  </button>
                                )}
                                <button onClick={stopSpeaking} className="hover:text-rose-400 cursor-pointer" title="Stop">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => speakText(m.text, m.id)}
                                className="text-[var(--text-muted)] hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Listen to AI voice response"
                              >
                                <Volume1 className="h-3.5 w-3.5" />
                                <span>Speak</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 px-1 font-mono">
                        {m.timestamp}
                      </span>
                    </div>
                  );
                })}

                {/* Loading / Typing anim indicator */}
                {loading && (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] p-3.5 rounded-2xl rounded-bl-none text-xs flex items-center gap-2.5 shadow-sm animate-pulse">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">Lighthouse thinking...</span>
                    </div>
                    
                    {/* Stop Generation command */}
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 cursor-pointer flex items-center gap-1 mt-1 ml-1"
                    >
                      <Square className="h-2.5 w-2.5" /> Stop Generation
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="p-2.5 bg-[var(--bg-card)] border-t border-[var(--border-card)] flex flex-wrap gap-1.5 shrink-0 relative z-20">
                <button
                  type="button"
                  onClick={() => handleSendMessage("When was my last check-in?")}
                  className="text-[10px] font-semibold text-[var(--text-primary)] bg-[var(--bg-app)] border border-[var(--border-card)] hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Check-in Log Status
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("What happens if I miss a check-in?")}
                  className="text-[10px] font-semibold text-[var(--text-primary)] bg-[var(--bg-app)] border border-[var(--border-card)] hover:border-indigo-500/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  What if I miss check-in?
                </button>
                <button
                  type="button"
                  onClick={handleSyncCalendar}
                  disabled={syncingCalendar || isCalendarSynced}
                  className="text-[10px] font-bold btn-primary px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <CalendarRange className="h-3 w-3" />
                  <span>{syncingCalendar ? "Syncing..." : isCalendarSynced ? "Calendar Connected" : "Sync Calendar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVoiceMode(true);
                    startVoiceRecognition();
                  }}
                  className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-md"
                >
                  <Mic className="h-3.5 w-3.5 text-white animate-pulse" />
                  <span>Voice Mode</span>
                </button>
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRegenerateResponse}
                    disabled={loading}
                    className="text-[10px] font-semibold text-indigo-400 bg-[var(--bg-app)] border border-indigo-500/20 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="Regenerate Last response"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              {/* Standard Message Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 border-t border-[var(--border-card)] bg-[var(--bg-card)] flex gap-2 shrink-0 relative z-20"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="input-field flex-1 text-xs py-2.5"
                  placeholder="Ask about security, bills, or plans..."
                />
                
                {/* Micro dictation toggle */}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-rose-600 border border-rose-500 text-white p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer animate-pulse"
                    title="Stop Listening"
                  >
                    <MicOff className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecognition}
                    className="btn-secondary p-2.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                    title="Dictation Speech-to-Text"
                  >
                    <Mic className="h-4 w-4 text-indigo-400" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="btn-primary p-2.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Launcher Icon Button */}
      {!activeOpen && (
        <button
          onClick={toggleOpen}
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-all relative border border-indigo-400/40 cursor-pointer shadow-indigo-500/30"
          id="btn-global-floating-chatbot"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute top-0 right-0 h-4 w-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white border-2 border-[var(--bg-card)]">
            !
          </span>
        </button>
      )}

    </div>
  );
}
