import { toPng, toSvg } from 'html-to-image';

export function downloadImage(dataUrl: string, extension: string) {
  const a = document.createElement('a');
  a.setAttribute('download', `archscope-diagram-${new Date().toISOString().split('T')[0]}.${extension}`);
  a.setAttribute('href', dataUrl);
  a.click();
}

export async function exportToPng(element: HTMLElement) {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#f9fafb', // gray-50 to match canvas background
      pixelRatio: 2, // High resolution
      filter: (node: HTMLElement) => {
        // We exclude UI overlays like panels and controls from the final image
        if (
          node?.classList?.contains('react-flow__minimap') || 
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__panel')
        ) {
          return false;
        }
        return true;
      },
    });
    downloadImage(dataUrl, 'png');
    return { success: true };
  } catch (err) {
    console.error('Failed to export PNG', err);
    return { success: false, error: err };
  }
}

export async function exportToSvg(element: HTMLElement) {
  try {
    const dataUrl = await toSvg(element, {
      backgroundColor: '#f9fafb', // gray-50
      filter: (node: HTMLElement) => {
        if (
          node?.classList?.contains('react-flow__minimap') || 
          node?.classList?.contains('react-flow__controls') ||
          node?.classList?.contains('react-flow__panel')
        ) {
          return false;
        }
        return true;
      },
    });
    downloadImage(dataUrl, 'svg');
    return { success: true };
  } catch (err) {
    console.error('Failed to export SVG', err);
    return { success: false, error: err };
  }
}
