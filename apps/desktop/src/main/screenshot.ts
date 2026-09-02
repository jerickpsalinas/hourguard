import { desktopCapturer } from 'electron';

export async function captureScreenshot(): Promise<Buffer | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) return null;

    const image = sources[0].thumbnail;
    return image.toJPEG(60);
  } catch {
    console.error('Failed to capture screenshot');
    return null;
  }
}
