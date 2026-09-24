export type TtsClipRequest = {
  kanji?: string;
  reading: string;
  pitchAccentPos?: number;
};

export type MoraTimingData = {
  charTimingsMs: Array<number>;
  totalDurationMs: number;
};

export type TtsClip = { bytes: Uint8Array; moraTiming?: MoraTimingData };

/**
 * Encodes the request into the comma-separated filename path the TTS service
 * expects (each field `encodeURIComponent`-encoded):
 *
 *   {reading}.mp3
 *   {reading},{pitchAccentPos}.mp3          // 2nd field integer → accent
 *   {kanji},{reading}.mp3                   // 2nd field non-int → kanji
 *   {kanji},{reading},{pitchAccentPos}.mp3
 */
export function buildTtsFilename(request: TtsClipRequest): string {
  const fields: Array<string> = [];
  if (request.kanji) {
    fields.push(request.kanji);
  }
  fields.push(request.reading);
  if (request.pitchAccentPos !== undefined) {
    fields.push(String(request.pitchAccentPos));
  }
  return `${fields.map(encodeURIComponent).join(',')}.mp3`;
}
