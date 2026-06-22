"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeLumaSpeechAction } from "./actions";
import { plainTextForSpeech } from "@/src/lib/lumaMessageFormat";
import type { LumaVoiceId } from "@/src/lib/lumaTts";

type SpeechRecognitionCtor = new () => SpeechRecognition;

const MAX_LISTEN_MS = 120_000;
const RESTART_DELAY_MS = 120;
const VOICE_STORAGE_KEY = "luma-voice-id";

let preferredVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

const WARM_VOICE_HINTS = [
  "samantha",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "victoria",
  "google uk english female",
  "microsoft aria",
  "female",
];

function pickWarmVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  for (const hint of WARM_VOICE_HINTS) {
    const match = english.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return english.find((v) => v.localService) ?? english[0] ?? null;
}

function cachePreferredVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) preferredVoice = pickWarmVoice(voices);
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  cachePreferredVoice();
  window.speechSynthesis.addEventListener("voiceschanged", cachePreferredVoice);
}

export function getStoredLumaVoice(): LumaVoiceId {
  if (typeof window === "undefined") return "shimmer";
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  if (stored === "shimmer" || stored === "nova" || stored === "coral" || stored === "alloy") {
    return stored;
  }
  return "shimmer";
}

export function storeLumaVoice(voice: LumaVoiceId) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_STORAGE_KEY, voice);
}

function speakWithBrowser(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  cachePreferredVoice();

  const prepared = plainTextForSpeech(text);
  const parts = prepared
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const phrases = parts.length > 0 ? parts : [prepared];

  let index = 0;
  const speakNext = () => {
    if (index >= phrases.length) return;
    const utter = new SpeechSynthesisUtterance(phrases[index]);
    utter.rate = 0.87;
    utter.pitch = 0.95;
    utter.volume = 0.92;
    if (preferredVoice) utter.voice = preferredVoice;
    utter.onend = () => {
      index += 1;
      if (index < phrases.length) window.setTimeout(speakNext, 340);
    };
    window.speechSynthesis.speak(utter);
  };
  speakNext();
}

function clearCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function readResults(event: SpeechRecognitionEvent): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    const chunk = result[0]?.transcript?.trim() ?? "";
    if (!chunk) continue;
    if (result.isFinal) finals.push(chunk);
    else interim += chunk;
  }
  return { finals, interim: interim.trim() };
}

type UseSpeechRecognitionOptions = {
  onFinalResult: (transcript: string) => void;
};

export function useSpeechRecognition({ onFinalResult }: UseSpeechRecognitionOptions) {
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wantListenRef = useRef(false);
  const previewRef = useRef("");
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinalResult);

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const clearTimers = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const finalize = useCallback(
    (submit: boolean) => {
      wantListenRef.current = false;
      clearTimers();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;

      const text = previewRef.current.replace(/\s+/g, " ").trim();
      previewRef.current = "";
      setInterimTranscript("");
      setListening(false);

      if (submit && text) onFinalRef.current(text);
    },
    [clearTimers]
  );

  const stop = useCallback(() => {
    finalize(previewRef.current.trim().length > 0);
  }, [finalize]);

  const restartRecognition = useCallback((recognition: SpeechRecognition, attempt = 0) => {
    if (!wantListenRef.current) return;
    restartTimerRef.current = setTimeout(() => {
      if (!wantListenRef.current) return;
      try {
        recognition.start();
      } catch {
        if (attempt < 3) restartRecognition(recognition, attempt + 1);
      }
    }, RESTART_DELAY_MS * (attempt + 1));
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor || wantListenRef.current) return;

    stopSpeaking();
    wantListenRef.current = true;
    previewRef.current = "";
    setInterimTranscript("");
    setListening(true);
    clearTimers();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const { finals, interim } = readResults(event);
      const preview = [...finals, interim].filter(Boolean).join(" ");
      previewRef.current = preview;
      setInterimTranscript(preview);
    };

    recognition.onend = () => {
      if (wantListenRef.current && recognitionRef.current === recognition) {
        restartRecognition(recognition);
      } else {
        setListening(false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "network") restartRecognition(recognition);
    };

    recognitionRef.current = recognition;
    maxTimerRef.current = setTimeout(() => finalize(true), MAX_LISTEN_MS);

    try {
      recognition.start();
    } catch {
      finalize(false);
    }
  }, [clearTimers, finalize, restartRecognition]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { listening, supported, interimTranscript, start, stop };
}

export async function speakText(
  text: string,
  options?: { voice?: LumaVoiceId; useOpenAiTts?: boolean }
) {
  if (typeof window === "undefined") return;

  stopSpeaking();
  const prepared = plainTextForSpeech(text);
  if (!prepared) return;

  const voice = options?.voice ?? getStoredLumaVoice();
  const useOpenAi = options?.useOpenAiTts ?? true;

  if (useOpenAi) {
    try {
      const result = await synthesizeLumaSpeechAction(prepared, voice);
      if (result.success) {
        const binary = atob(result.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        currentObjectUrl = URL.createObjectURL(blob);
        currentAudio = new Audio(currentObjectUrl);
        await currentAudio.play();
        return;
      }
    } catch {
      /* fall through to browser TTS */
    }
  }

  speakWithBrowser(prepared);
}

export function stopSpeaking() {
  clearCurrentAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
