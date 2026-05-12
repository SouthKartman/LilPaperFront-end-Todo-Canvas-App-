export interface IframePluginProps {
  src: string;
  sandbox?: string;
  allow?: string;
  loading?: 'eager' | 'lazy';
  referrerPolicy?: 'no-referrer' | 'origin' | 'strict-origin-when-cross-origin';
}

export interface IframePluginState {
  isLoading: boolean;
  error: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  currentUrl: string;
  title: string | null;
}

export interface IframeMessage {
  type: 'IFRAME_READY' | 'IFRAME_RESIZE' | 'IFRAME_NAVIGATE';
  payload?: any;
}