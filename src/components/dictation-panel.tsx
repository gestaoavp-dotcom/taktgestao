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

/**
 * Speech recognition gives no sign of which microphone it opened, so a muted
 * or wrong input device looks exactly like recording that hears nothing. This
 * listens to the same default device and reports the level, which tells the
 * two apart.
 */
async function openMicMonitor(onLevel: (level: number) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audio = new AudioContext();
  const analyser = audio.createAnalyser();
  analyser.fftSize = 512;
  audio.createMediaStreamSource(stream).connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let frame = 0;

  const tick = () => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += (sample - 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / samples.length) / 40));
    frame = requestAnimationFrame(tick);
  };
  tick();

  return {
    monitor: { stream, audio, get frame() { return frame; } },
    label: stream.getAudioTracks()[0]?.label ?? null,
  };
}

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

  const [level, setLevel] = useState(0);
  const [device, setDevice] = useState<string | null>(null);
  const [deaf, setDeaf] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const micRef = useRef<{ stream: MediaStream; audio: AudioContext; frame: number } | null>(null);
  const peakRef = useRef(0);
  const finalRef = useRef("");
  /** True only between pressing stop and the engine confirming it. */
  const stoppingRef = useRef(false);

  useEffect(
    () => () => {
      stoppingRef.current = true;
      recognitionRef.current?.abort();
      micRef.current?.stream.getTracks().forEach((track) => track.stop());
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
      closeMic();

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
    setDeaf(false);
    finalRef.current = "";
    peakRef.current = 0;
    stoppingRef.current = false;

    void navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then(async (probe) => {
        probe.getTracks().forEach((t) => t.stop());
        const { monitor, label } = await openMicMonitor((value) => {
          peakRef.current = Math.max(peakRef.current, value);
          setLevel(value);
        });
        micRef.current = monitor as never;
        setDevice(label);
        // Recording with a flat signal means the device is not the one picking
        // up the voice.
        window.setTimeout(() => {
          if (peakRef.current < 0.02) setDeaf(true);
        }, 4000);
      })
      .catch(() => setDevice(null));

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

  function closeMic() {
    const mic = micRef.current;
    if (!mic) return;
    cancelAnimationFrame(mic.frame);
    mic.stream.getTracks().forEach((track) => track.stop());
    void mic.audio.close();
    micRef.current = null;
    setLevel(0);
  }

  function stop() {
    stoppingRef.current = true;
    recognitionRef.current?.stop();
    closeMic();
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

      {listening && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94A0BD]">
            Microfone
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-gray">
            <div
              className={`h-full rounded-full transition-[width] duration-75 ${
                level > 0.02 ? "bg-green-500" : "bg-brand-gray"
              }`}
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>
          {device && (
            <span className="max-w-[220px] truncate text-[11px] text-[#94A0BD]" title={device}>
              {device}
            </span>
          )}
        </div>
      )}

      {listening && deaf && (
        <p className="mt-2 rounded bg-orange-50 px-3 py-2 text-xs text-[#c2410c]">
          A barra não se move: o microfone em uso não está captando sua voz. Troque o dispositivo de
          entrada nas configurações de som do computador — o reconhecimento de voz usa sempre o
          microfone padrão do sistema.
        </p>
      )}

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
