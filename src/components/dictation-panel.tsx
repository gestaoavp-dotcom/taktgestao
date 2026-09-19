"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Wand2 } from "lucide-react";
import { parseDictation, type DictatedChange } from "@/lib/dictation";
import type { ChangeChannelOption } from "@/lib/client-changes";

// The browser's own speech recognition: no key, no cost, nothing sent by us.
//
// Three behaviours shape this component:
//  - The engine ends a session by itself after a pause, even with `continuous`
//    on. That used to be treated as "finished", which cut people off, so only
//    an explicit stop ends the dictation; anything else restarts.
//  - `results` is re-indexed on each restart, so settled text accumulates in a
//    ref and only the tail counts as provisional.
//  - The transcript is editable. Speech recognition mishears product names and
//    numbers, and fixing the sentence is faster than fixing five fields.

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

export function DictationPanel({
  channels,
  onParsed,
}: {
  channels: ChangeChannelOption[];
  onParsed: (parsed: DictatedChange) => void;
}) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  /** True only between pressing stop and the engine confirming it. */
  const stoppingRef = useRef(false);

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
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else pending += result[0].transcript;
      }
      setText(finalRef.current);
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      // A quiet stretch is not a failure; onend picks the session back up.
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(MESSAGES[event.error] ?? `Falha no reconhecimento de voz (${event.error}).`);
      stoppingRef.current = true;
      setListening(false);
    };

    recognition.onend = () => {
      if (!stoppingRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Falls through to finishing if the engine refuses to restart.
        }
      }

      setListening(false);
      setInterim("");

      const spoken = finalRef.current.trim();
      if (spoken) onParsed(parseDictation(spoken, channels));
      else
        setError(
          "Não captei nenhuma palavra. Verifique o microfone selecionado no navegador, ou escreva no campo abaixo.",
        );
    };
  }

  function start() {
    const recognition = createRecognition();
    if (!recognition) {
      setUnsupported(true);
      return;
    }

    setError(null);
    setText("");
    setInterim("");
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
    setListening(false);
  }

  const full = `${text}${interim}`;

  return (
    <div className="mb-4 rounded-lg border border-dashed border-navy/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy">Ditar alteração</p>
          <p className="text-xs text-[#94A0BD]">
            Diga o dia, a conta, a categoria, o que foi feito, o motivo, o responsável, o status, o
            resultado esperado e a observação.
          </p>
        </div>

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
              Gravar
            </>
          )}
        </button>
      </div>

      <textarea
        value={full}
        onChange={(e) => {
          finalRef.current = e.target.value;
          setText(e.target.value);
          setInterim("");
        }}
        rows={3}
        placeholder={
          listening
            ? "Ouvindo…"
            : "Grave um áudio ou escreva aqui a alteração, e clique em Transformar em alteração."
        }
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy outline-none placeholder:text-[#94A0BD] focus:border-blue ${
          listening ? "border-red-300" : "border-navy/10"
        }`}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#94A0BD]">
          {listening
            ? "Falando… o texto aparece conforme for reconhecido."
            : "Confira o texto antes de transformar — dá para corrigir direto aqui."}
        </p>
        <button
          type="button"
          disabled={!full.trim() || listening}
          onClick={() => onParsed(parseDictation(full.trim(), channels))}
          className="flex items-center gap-2 rounded-lg border border-navy/10 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-brand-gray disabled:opacity-40"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Transformar em alteração
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      {unsupported && (
        <p className="mt-2 text-xs text-[#94A0BD]">
          O ditado por voz funciona no Chrome, Edge e Safari. Nesse navegador, escreva no campo
          acima ou preencha os campos normalmente.
        </p>
      )}
    </div>
  );
}
