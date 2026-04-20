/**
 * Voice command input hook.
 * Uses expo-speech-recognition / react-native-voice for STT.
 * Maps intents: NAVIGATE_SEAT, NAVIGATE_EXIT, NAVIGATE_RESTROOM, NAVIGATE_KIOSK,
 *               OPEN_HEATMAP, CANCEL_NAVIGATION, REPEAT_INSTRUCTION
 * Clarification prompt for unrecognized intents.
 * Requirements: 24.1, 24.2
 */
import { useState, useCallback, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

export type VoiceIntent =
  | 'NAVIGATE_SEAT'
  | 'NAVIGATE_EXIT'
  | 'NAVIGATE_RESTROOM'
  | 'NAVIGATE_KIOSK'
  | 'OPEN_HEATMAP'
  | 'CANCEL_NAVIGATION'
  | 'REPEAT_INSTRUCTION'
  | 'UNRECOGNIZED';

export interface VoiceCommandResult {
  intent: VoiceIntent;
  rawText: string;
  params?: Record<string, string>;
}

const INTENT_PATTERNS: Array<{ intent: VoiceIntent; patterns: RegExp[] }> = [
  {
    intent: 'NAVIGATE_SEAT',
    patterns: [
      /take me to my seat/i,
      /navigate to (my )?seat/i,
      /find my seat/i,
      /go to seat/i,
    ],
  },
  {
    intent: 'NAVIGATE_EXIT',
    patterns: [
      /find (the )?(nearest )?exit/i,
      /take me to (the )?(nearest )?exit/i,
      /navigate to exit/i,
      /where('s| is) the exit/i,
    ],
  },
  {
    intent: 'NAVIGATE_RESTROOM',
    patterns: [
      /find (the )?(nearest )?restroom/i,
      /where('s| is) the (restroom|bathroom|toilet)/i,
      /take me to (the )?(nearest )?(restroom|bathroom)/i,
    ],
  },
  {
    intent: 'NAVIGATE_KIOSK',
    patterns: [
      /find (a |the )?(nearest )?kiosk/i,
      /where('s| is) (the |a )?kiosk/i,
      /take me to (a |the )?(nearest )?kiosk/i,
      /order food/i,
    ],
  },
  {
    intent: 'OPEN_HEATMAP',
    patterns: [
      /open (the )?heatmap/i,
      /show (me )?(the )?crowd map/i,
      /show (me )?(the )?heatmap/i,
      /how crowded is it/i,
    ],
  },
  {
    intent: 'CANCEL_NAVIGATION',
    patterns: [
      /cancel (navigation|route)/i,
      /stop navigation/i,
      /stop (giving )?directions/i,
    ],
  },
  {
    intent: 'REPEAT_INSTRUCTION',
    patterns: [
      /repeat (that|instruction|direction)/i,
      /say that again/i,
      /what did you say/i,
    ],
  },
];

const CLARIFICATION_MESSAGE =
  "Sorry, I didn't catch that. Try saying 'find the nearest exit' or 'take me to my seat'.";

function classifyIntent(text: string): VoiceCommandResult {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { intent, rawText: text };
      }
    }
  }
  return { intent: 'UNRECOGNIZED', rawText: text };
}

export function useVoiceCommands(onCommand: (result: VoiceCommandResult) => void) {
  const [isListening, setIsListening] = useState(false);
  const [clarificationMessage, setClarificationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const setupVoice = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? '';
      const result = classifyIntent(text);

      if (result.intent === 'UNRECOGNIZED') {
        setClarificationMessage(CLARIFICATION_MESSAGE);
        setTimeout(() => setClarificationMessage(null), 4000);
      } else {
        setClarificationMessage(null);
        onCommand(result);
      }
      setIsListening(false);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setError(e.error?.message ?? 'Voice recognition error');
      setIsListening(false);
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
    };
  }, [onCommand]);

  const startListening = useCallback(async () => {
    setupVoice();
    setError(null);
    setClarificationMessage(null);
    try {
      await Voice.start('en-US');
      setIsListening(true);
    } catch (err: any) {
      setError(err?.message ?? 'Could not start voice recognition');
    }
  }, [setupVoice]);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  const destroy = useCallback(async () => {
    try {
      await Voice.destroy();
    } catch {
      // ignore
    }
    initializedRef.current = false;
  }, []);

  return {
    isListening,
    clarificationMessage,
    error,
    startListening,
    stopListening,
    destroy,
  };
}
