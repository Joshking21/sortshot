import TextRecognition, { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import { Platform } from 'react-native';

export interface OcrResult {
  text: string;
  blocks: string[];
}

export async function recognizeTextFromUri(imageUri: string): Promise<OcrResult> {
  if (!imageUri) {
    return { text: '', blocks: [] };
  }

  try {
    // If running in development environments without native ML Kit linked (e.g., Web)
    if (Platform.OS === 'web') {
      return { text: '', blocks: [] };
    }

    // Call ML Kit on-device Text Recognition
    const result: TextRecognitionResult = await TextRecognition.recognize(imageUri);

    if (!result || !result.blocks) {
      return {
        text: result?.text || '',
        blocks: result?.text ? [result.text] : [],
      };
    }

    const blockTexts: string[] = [];
    for (const block of result.blocks) {
      if (block.text && block.text.trim()) {
        blockTexts.push(block.text.trim());
      }
    }

    const joinedText = blockTexts.join('\n');
    return {
      text: joinedText,
      blocks: blockTexts,
    };
  } catch (err) {
    console.warn(`[OCR] Recognition failed for URI: ${imageUri}`, err);
    throw err;
  }
}
