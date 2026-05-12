import { useState, useCallback, useRef, useEffect } from 'react';
import { IframePluginState, IframePluginProps } from '../model/types';

export const useIframePlugin = (
  initialSrc: string,
  onUrlChange?: (url: string) => void,
  onTitleChange?: (title: string) => void
) => {
  const [state, setState] = useState<IframePluginState>({
    isLoading: true,
    error: null,
    canGoBack: false,
    canGoForward: false,
    currentUrl: initialSrc,
    title: null,
  });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyStack = useRef<string[]>([initialSrc]);
  const historyIndex = useRef<number>(0);

  const updateNavigationState = useCallback(() => {
    setState(prev => ({
      ...prev,
      canGoBack: historyIndex.current > 0,
      canGoForward: historyIndex.current < historyStack.current.length - 1,
    }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const navigateTo = useCallback((url: string) => {
    if (!url) return;
    
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }
    
    // Обрезаем старую историю если мы не в конце
    if (historyIndex.current < historyStack.current.length - 1) {
      historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    }
    
    historyStack.current.push(finalUrl);
    historyIndex.current = historyStack.current.length - 1;
    
    setState(prev => ({ 
      ...prev, 
      currentUrl: finalUrl, 
      isLoading: true, 
      error: null 
    }));
    
    updateNavigationState();
    onUrlChange?.(finalUrl);
  }, [onUrlChange, updateNavigationState]);

  const reload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = state.currentUrl;
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }
  }, [state.currentUrl]);

  const goBack = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const url = historyStack.current[historyIndex.current];
      setState(prev => ({ 
        ...prev, 
        currentUrl: url, 
        isLoading: true, 
        error: null 
      }));
      updateNavigationState();
      onUrlChange?.(url);
    }
  }, [onUrlChange, updateNavigationState]);

  const goForward = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current++;
      const url = historyStack.current[historyIndex.current];
      setState(prev => ({ 
        ...prev, 
        currentUrl: url, 
        isLoading: true, 
        error: null 
      }));
      updateNavigationState();
      onUrlChange?.(url);
    }
  }, [onUrlChange, updateNavigationState]);

  const handleLoad = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: false, error: null }));
    
    // Пытаемся получить заголовок страницы (если есть доступ)
    try {
      if (iframeRef.current?.contentDocument?.title) {
        const title = iframeRef.current.contentDocument.title;
        setState(prev => ({ ...prev, title }));
        onTitleChange?.(title);
      }
    } catch (e) {
      // CORS - не можем получить title
      console.debug('Cannot access iframe title due to CORS');
    }
  }, [onTitleChange]);

  const handleError = useCallback(() => {
    setError('Failed to load the website. Check if the URL is correct and the site allows embedding (X-Frame-Options).');
  }, [setError]);

  // Получение сообщений от iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }
      
      const data = event.data as IframeMessage;
      
      switch (data?.type) {
        case 'IFRAME_READY':
          console.log('Iframe is ready');
          break;
        case 'IFRAME_RESIZE':
          if (data.payload?.width && data.payload?.height) {
            // Можно обработать ресайз от iframe
            console.log('Iframe requested resize:', data.payload);
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    iframeRef,
    state,
    navigateTo,
    reload,
    goBack,
    goForward,
    setLoading,
    setError,
    handleLoad,
    handleError,
  };
};