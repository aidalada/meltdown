// Minimal Web Speech API types (SPEC 12.1). lib.dom does not ship SpeechRecognition.
export {};

declare global {
  interface MeltdownSpeechAlternative { readonly transcript: string; readonly confidence: number }
  interface MeltdownSpeechResult { readonly isFinal: boolean; readonly length: number; readonly [index: number]: MeltdownSpeechAlternative }
  interface MeltdownSpeechResultList { readonly length: number; readonly [index: number]: MeltdownSpeechResult }
  interface MeltdownSpeechEvent extends Event { readonly resultIndex: number; readonly results: MeltdownSpeechResultList }
  interface MeltdownSpeechErrorEvent extends Event { readonly error: string }
  interface MeltdownSpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onresult: ((event: MeltdownSpeechEvent) => void) | null;
    onerror: ((event: MeltdownSpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }
  type MeltdownSpeechRecognitionCtor = new () => MeltdownSpeechRecognition;
  interface Window {
    webkitSpeechRecognition?: MeltdownSpeechRecognitionCtor;
  }
}
