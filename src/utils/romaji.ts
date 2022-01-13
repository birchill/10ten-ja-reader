import { kanaToHiragana } from '@birchill/normal-jp';

// Convert using a modified Hepburn-ish romajification

const replacements: Array<[string, string]> = [
  ['あ', 'a'],
  ['い', 'i'],
  ['う', 'u'],
  ['え', 'e'],
  ['お', 'o'],
  ['か', 'ka'],
  ['き', 'ki'],
  ['く', 'ku'],
  ['け', 'ke'],
  ['こ', 'ko'],
  ['きゃ', 'kya'],
  ['きゅ', 'kyu'],
  ['きょ', 'kyo'],
  ['さ', 'sa'],
  ['し', 'shi'],
  ['す', 'su'],
  ['せ', 'se'],
  ['そ', 'so'],
  ['しゃ', 'sha'],
  ['しゅ', 'shu'],
  ['しょ', 'sho'],
  ['た', 'ta'],
  ['ち', 'chi'],
  ['つ', 'tsu'],
  ['て', 'te'],
  ['と', 'to'],
  ['ちゃ', 'cha'],
  ['ちゅ', 'chu'],
  ['ちょ', 'cho'],
  ['な', 'na'],
  ['に', 'ni'],
  ['ぬ', 'nu'],
  ['ね', 'ne'],
  ['の', 'no'],
  ['にゃ', 'nya'],
  ['にゅ', 'nyu'],
  ['にょ', 'nyo'],
  ['は', 'ha'],
  ['ひ', 'hi'],
  ['ふ', 'fu'],
  ['へ', 'he'],
  ['ほ', 'ho'],
  ['ひゃ', 'hya'],
  ['ひゅ', 'hyu'],
  ['ひょ', 'hyo'],
  ['ま', 'ma'],
  ['み', 'mi'],
  ['む', 'mu'],
  ['め', 'me'],
  ['も', 'mo'],
  ['みゃ', 'mya'],
  ['みゅ', 'myu'],
  ['みょ', 'myo'],
  ['や', 'ya'],
  ['ゆ', 'yu'],
  ['よ', 'yo'],
  ['ら', 'ra'],
  ['り', 'ri'],
  ['る', 'ru'],
  ['れ', 're'],
  ['ろ', 'ro'],
  ['りゃ', 'rya'],
  ['りゅ', 'ryu'],
  ['りょ', 'ryo'],
  ['わ', 'wa'],
  ['ゐ', 'i'],
  ['ゑ', 'e'],
  ['を', 'o'],
  ['ん', 'n'],
  ['が', 'ga'],
  ['ぎ', 'gi'],
  ['ぐ', 'gu'],
  ['げ', 'ge'],
  ['ご', 'go'],
  ['ぎゃ', 'gya'],
  ['ぎゅ', 'gyu'],
  ['ぎょ', 'gyo'],
  ['ざ', 'za'],
  ['じ', 'ji'],
  ['ず', 'zu'],
  ['ぜ', 'ze'],
  ['ぞ', 'zo'],
  ['じゃ', 'ja'],
  ['じゅ', 'ju'],
  ['じょ', 'jo'],
  ['だ', 'da'],
  ['ぢ', 'ji'],
  ['づ', 'zu'],
  ['で', 'de'],
  ['ど', 'do'],
  ['ぢゃ', 'ja'],
  ['ぢゅ', 'ju'],
  ['ぢょ', 'jo'],
  ['ば', 'ba'],
  ['び', 'bi'],
  ['ぶ', 'bu'],
  ['べ', 'be'],
  ['ぼ', 'bo'],
  ['びゃ', 'bya'],
  ['びゅ', 'byu'],
  ['びょ', 'byo'],
  ['ぱ', 'pa'],
  ['ぴ', 'pi'],
  ['ぷ', 'pu'],
  ['ぺ', 'pe'],
  ['ぽ', 'po'],
  ['ぴゃ', 'pya'],
  ['ぴゅ', 'pyu'],
  ['ぴょ', 'pyo'],

  // The following almost always appear in katakana, but well, people do crazy
  // stuff so let's handle them in hiragana too (and it makes handling this
  // easier too since we can just blindly convert everything to hiragana as
  // a pre-processing step).
  ['いぃ', 'yi'],
  ['いぇ', 'ye'],
  ['うぁ', 'wa'],
  ['うぃ', 'wi'],
  ['うぅ', 'wu'],
  ['うぇ', 'we'],
  ['うぉ', 'wo'],
  ['うゅ', 'wyu'],
  ['ゔぁ', 'va'],
  ['ゔぃ', 'vi'],
  ['ゔ', 'vu'],
  ['ゔぇ', 've'],
  ['ゔぉ', 'vo'],
  ['ゔゃ', 'vya'],
  ['ゔゅ', 'vyu'],
  ['ゔぃぇ', 'vye'],
  ['ゔょ', 'vyo'],
  ['きぇ', 'kye'],
  ['ぎぇ', 'gye'],
  ['くぁ', 'kwa'],
  ['くぃ', 'kwi'],
  ['くぇ', 'kwe'],
  ['くぉ', 'kwo'],
  ['くゎ', 'kwa'],
  ['ぐぁ', 'gwa'],
  ['ぐぃ', 'gwi'],
  ['ぐぇ', 'gwe'],
  ['ぐぉ', 'gwo'],
  ['ぐゎ', 'gwa'],
  ['しぇ', 'she'],
  ['じぇ', 'je'],
  ['すぃ', 'si'],
  ['ずぃ', 'zi'],
  ['ちぇ', 'che'],
  ['つぁ', 'tsa'],
  ['つぃ', 'tsi'],
  ['つぇ', 'tse'],
  ['つぉ', 'tso'],
  ['つゅ', 'tsyu'],
  ['てぃ', 'ti'],
  ['とぅ', 'tu'],
  ['てゅ', 'tyu'],
  ['でぃ', 'di'],
  ['どぅ', 'du'],
  ['でゅ', 'dyu'],
  ['にぇ', 'nye'],
  ['ひぇ', 'hye'],
  ['びぇ', 'bye'],
  ['ぴぇ', 'pye'],
  ['ふぁ', 'fa'],
  ['ふぃ', 'fi'],
  ['ふぇ', 'fe'],
  ['ふぉ', 'fo'],
  ['ふゃ', 'fya'],
  ['ふゅ', 'fyu'],
  ['ふぃぇ', 'fye'],
  ['ふょ', 'fyo'],
  ['ほぅ', 'hu'],
  ['みぇ', 'mye'],
  ['りぇ', 'rye'],
  ['ら゜', 'la'],
  ['り゜', 'li'],
  ['る゜', 'lu'],
  ['れ゜', 'le'],
  ['ろ゜', 'lo'],
  ['り゜ゃ', 'lya'],
  ['り゜ゅ', 'lyu'],
  ['り゜ぇ', 'lye'],
  ['り゜ょ', 'lyo'],

  // These ones don't have hiragana equivalents, but these are basically for
  // マニアック anyway.
  ['ヷ', 'va'],
  ['ヸ', 'vi'],
  ['ヹ', 've'],
  ['ヺ', 'vo'],
  ['ー', '-'],

  // Seriously maniac territory here
  ['ゟ', 'yori'],
  ['ヿ', 'koto'],
];

const maxReplacementLength = Math.max(...replacements.map(([a]) => a.length));
const replacementMap = new Map(replacements);

export function toRomaji(kana: string): string {
  // We don't currently convert half-width katakana simply because we're not
  // expecting to encounter it. If we do, we can use toNormalize for that.
  const hiragana = kanaToHiragana(kana);

  let result = '';

  // Special handling for っ so we can handle すっっっっっっごく high-tension
  // expressions.
  //
  // (This will probably never appear in any dictionary entries, but in the
  // interests of making this function a little more general-use we handle it
  // anyway.)
  let explosiveness = 0;

  // Apply any built-up explosiveness when we don't have any following hiragana
  // to apply it to.
  const explode = () => {
    if (explosiveness) {
      result += "'".repeat(explosiveness);
      explosiveness = 0;
    }
  };

  let i = 0;
  while (i < hiragana.length) {
    const firstCharCode = hiragana.charCodeAt(i);

    // Check for っ
    if (firstCharCode === 0x3063) {
      explosiveness++;
      i++;
      continue;
    }

    // Skip anything that is clearly out of range
    if (firstCharCode < 0x3041) {
      explode();
      result += hiragana.substr(i, 1);
      i++;
      continue;
    }

    let substringLength = Math.max(maxReplacementLength, hiragana.length - i);

    while (substringLength) {
      const substring = hiragana.substr(i, substringLength);
      const replacement = replacementMap.get(substring);
      if (replacement) {
        if (explosiveness) {
          const initial = replacement[0] === 'c' ? 't' : replacement[0];
          result += initial.repeat(explosiveness);
          explosiveness = 0;
        }

        // Separate a vowel from a previous ん
        if (
          replacement.length === 1 &&
          result &&
          result[result.length - 1] === 'n' &&
          ['a', 'e', 'i', 'o', 'u'].includes(replacement)
        ) {
          result += '-';
        }

        result += replacement;
        break;
      }

      substringLength--;
    }

    // No match found, just append the character as-is.
    if (!substringLength) {
      explode();
      result += hiragana.substr(i, 1);
      substringLength = 1;
    }

    i += substringLength;
  }

  // Handle final っ (e.g. あつっ → atsu')
  explode();

  return result;
}
