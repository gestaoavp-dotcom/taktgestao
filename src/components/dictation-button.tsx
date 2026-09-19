"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { parseDictation, type DictatedChange } from "@/lib/dictation";
import type { ChangeChannelOption } from "@/lib/client-changes";

// The browser's own speech recognition: no key, no cost, and nothing to send
// anywhere ourselves.
//
// Two behaviours drive the shape of this component:
//  - The engine ends the session by itself after a pause, even with
//    `continuous` on. Treating that as "the person finished" cut people off
//    mid-sentence, so a session that ends on its own is restarted and only an
//    explicit stop finishes the dictation.
//  - `results` is re-indexed after each restart, so finalised text accumulates
//    in a ref and only the tail is treated as provisional.

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const MESSAGES: Record<string, string> = {
  "not-allowed": "O navegador bloqueou o microfone. Libere o acesso no cadeado da barra de endereço.",
  "service-not-allowed": "O navegador bloqueou o serviço de reconhecimento de voz.",
  "audio-capture": "Nenhum microfone encontrado. Verifique se há um conectado e selecionado.",
  network: "O reconhecimento de voz precisa de internet e a conexão falhou.",
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
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  /** True only between the person pressing stop and the engine confirming it. */
  const stoppingRef = useRef(false);

  // Assumed supported until a click proves otherwise: checking during render
  // would read `window` on the server and mismatch on hydration.
  useEffect(
    () => () => {
      stoppingRef.current = true;
      recognitionRef.current?.abort();
    },
    [],
  );

  function attach(recognition: SpeechRecognitionLike) {
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setFinalText(finalRef.current);
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      // A quiet stretch is not a failure — the session is picked back up in
      // onend, so keep listening.
      if (event.error === "no-speech" || event.error === "aborted") return;

      setError(MESSAGES[event.error] ?? `Falha no reconhecimento de voz (${event.error}).`);
      stoppingRef.current = true;
      setListening(false);
    };

    recognition.onend = () => {
      if (!stoppingRef.current) {
        // Ended on its own after a pause — pick it straight back up.
        try {
          recognition.start();
          return;
        } catch {
          // Falls through to finishing if the engine refuses to restart.
        }
      }
      setListening(false);
      setInterimText("");

      const spoken = finalRef.current.trim();
      if (spoken) {
        onParsed(parseDictation(spoken, channels), spoken);
      } else {
        // Silence looks identical to a broken microphone unless we say so.
        setError(
          "Não captei nenhuma palavra. Verifique se o microfone certo está selecionado no navegador e fale mais perto.",
        );
      }
    };
  }

  function start() {
    const recognition = createRecognition();
    if (!recognition) {
      setSupported(false);
      return;
    }

    setError(null);
    setFinalText("");
    setInterimText("");
    finalRef.current = "";
    stoppingRef.current = false;

    attach(recognition);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError(`Não consegui iniciar a gravação: ${(e as Error).message}`);
      return;
    }
    setListening(true);
  }

  function stop() {
    stoppingRef.current = true;
    recognitionRef.current?.stop();
    // Don't wait on the engine: the button should react to the click at once.
    setListening(false);
  }

  if (!supported) {
    return (
      <p className="max-w-xs text-xs text-[#94A0BD]">
        O ditado por voz funciona no Chrome, Edge e Safari. Nesse navegador, preencha os campos
        normalmente.
      </p>
    );
  }

  const live = `${finalText}${interimText}`.trim();

  return (
    <div className="flex max-w-md flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          listening
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border border-navy/10 text-navy hover:bg-brand-gray"
        }`}
      >
        {listening ? (
          <>
            <Square className="h-4 w-4 fill-current" />
            Parar e preencher
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-white" />
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Ditar alteração
          </>
        )}
      </button>

      {(listening || live) && (
        <div className="w-full rounded-lg border border-navy/10 bg-brand-gray/30 p-3">
          {listening && !live && (
            <p className="text-xs text-[#94A0BD]">
              Ouvindo… diga o dia, a conta, a categoria, o que foi feito, o motivo, o responsável,
              o status, o resultado esperado e a observação.
            </p>
          )}
          {live && (
            <p className="text-sm text-navy">
              {finalText}
              <span className="text-[#94A0BD]">{interimText}</span>
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
