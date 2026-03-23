/**
 * Splits a long message into multiple chunks to respect Telegram's 4096 character limit.
 */
export function splitMessage(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < text.length) {
    let chunk = text.substring(currentPos, currentPos + maxLength);
    
    // Try to find a good place to split (newline or space) if possible
    if (currentPos + maxLength < text.length) {
      const lastNewline = chunk.lastIndexOf("\n");
      const lastSpace = chunk.lastIndexOf(" ");
      
      const splitAt = lastNewline > maxLength * 0.8 ? lastNewline : (lastSpace > maxLength * 0.8 ? lastSpace : maxLength);
      chunk = text.substring(currentPos, currentPos + splitAt);
      currentPos += splitAt;
    } else {
      currentPos += maxLength;
    }
    
    chunks.push(chunk.trim());
  }

  return chunks;
}
