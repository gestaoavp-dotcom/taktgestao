"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { parseDictation, type DictatedChange } from "@/lib/dictation";
import type { ChangeChannelOption } from "@/lib/client-changes";

// The browser's own speech recognition: no key, no cost, and the audio never
// leaves the person's machine on its way to us.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function DictationButton({
  channels,
  onParsed,
}: {
  channels: ChangeChannelOption[];
  onParsed: (parsed: DictatedChange, transcript: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef("");

  function start() {
    const recognition = createRecognition();
    if (!recognition) {
      setSupported(false);
      return;
    }

    setError(null);
    setTranscript("");
    textRef.current = "";

    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) full += event.results[i][0].transcript;
      textRef.current = full;
      setTranscript(full);
    };
    recognition.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Preciso de permissão para usar o microfone."
          : "Não consegui captar o áudio. Tente de novo.",
      );
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      const spoken = textRef.current.trim();
      if (spoken) onParsed(parseDictation(spoken, channels), spoken);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  if (!supported) {
    return (
      <p className="text-xs text-[#94A0BD]">
        O ditado por voz funciona no Chrome, Edge e Safari. Nesse navegador, preencha os campos
        normalmente.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => (listening ? recognitionRef.current?.stop() : start())}
        className={`flex items-center gap-2 self-start rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          listening
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border border-navy/10 text-navy hover:bg-brand-gray"
        }`}
      >
        {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {listening ? "Parar e preencher" : "Ditar alteração"}
      </button>

      {listening && (
        <p className="text-xs text-[#5B647E]">
          Ouvindo… diga: <em>no dia tal, na conta tal, categoria tal, fiz tal coisa, pelo motivo
          tal, responsável fulano, está em andamento, resultado esperado tal, observação tal</em>.
        </p>
      )}
      {transcript && <p className="text-xs italic text-[#94A0BD]">&ldquo;{transcript}&rdquo;</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
