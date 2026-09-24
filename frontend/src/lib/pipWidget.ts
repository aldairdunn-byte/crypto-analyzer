import { storageGet } from './storageAdapter.ts';

export interface PiPWindowOptions {
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
}

/**
 * Checks if the browser supports Document Picture-in-Picture API
 */
export function isDocumentPiPSupported(win?: any): boolean {
  const targetWin = win !== undefined ? win : (typeof window !== 'undefined' ? window : null);
  if (!targetWin) return false;
  return Boolean(
    targetWin.documentPictureInPicture &&
    typeof targetWin.documentPictureInPicture.requestWindow === 'function'
  );
}

/**
 * Builds standard dimensions and options for the floating widget
 */
export function buildPiPWindowOptions(width = 345, height = 175): PiPWindowOptions {
  return {
    width,
    height,
    disallowReturnToOpener: true,
  };
}

/**
 * Copies all stylesheets and linked CSS from the parent document to the target window
 */
export function copyStylesToWindow(targetDoc: any, sourceDoc: any = (typeof document !== 'undefined' ? document : null)): void {
  if (!targetDoc || !sourceDoc) return;
  try {
    const styleSheets = Array.from(sourceDoc.styleSheets || []) as CSSStyleSheet[];
    for (const sheet of styleSheets) {
      try {
        if (sheet.cssRules && targetDoc.createElement) {
          const rules = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
          const style = targetDoc.createElement('style');
          style.textContent = rules;
          targetDoc.head?.appendChild(style);
        } else if (sheet.href && targetDoc.createElement) {
          const link = targetDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          targetDoc.head?.appendChild(link);
        }
      } catch {
        if (sheet.href && targetDoc.createElement) {
          const link = targetDoc.createElement('link');
          link.rel = 'stylesheet';
          link.href = sheet.href;
          targetDoc.head?.appendChild(link);
        }
      }
    }
  } catch {}
}

/**
 * Launches the widget using Document Picture-in-Picture if supported,
 * or falls back to an optimized popup window.
 * Returns true if PiP was launched, false if fallback was used.
 */
export async function launchWidgetWindow(
  win?: any,
  onFallback?: () => void
): Promise<boolean> {
  const currentWin = win !== undefined ? win : (typeof window !== 'undefined' ? window : null);
  if (!currentWin) return false;

  const url = `${currentWin.location?.origin || ''}/?view=widget&standalone=1`;

  // 1. Try Document Picture-in-Picture
  if (isDocumentPiPSupported(currentWin)) {
    try {
      const opts = buildPiPWindowOptions(345, 175);
      const pipWindow = await currentWin.documentPictureInPicture.requestWindow(opts);

      if (pipWindow) {
        // Navigate or set PiP window location
        if (pipWindow.location) {
          pipWindow.location.href = url;
        }

        // Copy styles if document is available
        if (pipWindow.document && currentWin.document) {
          copyStylesToWindow(pipWindow.document, currentWin.document);
        }

        return true;
      }
    } catch {
      // User dismissed prompt or PiP request rejected; proceed to fallback
    }
  }

  // 2. Fallback: window.open popup
  if (onFallback) {
    onFallback();
  } else if (typeof currentWin.open === 'function') {
    const savedX = storageGet('crypto_analyzer_widget_x');
    const savedY = storageGet('crypto_analyzer_widget_y');
    const left = savedX ? parseInt(savedX) : Math.max(0, (currentWin.screenX || 0) + (currentWin.outerWidth || 1200) - 380);
    const top  = savedY ? parseInt(savedY) : Math.max(0, (currentWin.screenY || 0) + 60);

    const popup = currentWin.open(
      url,
      'CryptoAnalyzerWidgetPopup',
      `width=345,height=175,left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=no`
    );

    if (!popup && currentWin.location?.origin) {
      currentWin.open(`${currentWin.location.origin}/?view=widget`, '_blank');
    }
  }

  return false;
}
