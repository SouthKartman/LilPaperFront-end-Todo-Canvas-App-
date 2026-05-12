// Утилиты для обмена сообщениями с iframe

export const sendMessageToIframe = (
  iframe: HTMLIFrameElement | null,
  type: string,
  payload?: any
) => {
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      { type, payload, source: 'lil-papper-app' },
      '*'
    );
  }
};

export const listenToIframeMessages = (
  callback: (type: string, payload: any) => void
) => {
  const handler = (event: MessageEvent) => {
    if (event.data?.source === 'lil-papper-plugin') {
      callback(event.data.type, event.data.payload);
    }
  };
  
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};

// Генерация безопасного sandbox
export const getSandboxPermissions = (permissions: string[] = []): string => {
  const defaultPermissions = [
    'allow-same-origin',
    'allow-scripts',
    'allow-popups',
    'allow-forms',
    'allow-modals',
  ];
  
  const allPermissions = [...defaultPermissions, ...permissions];
  return allPermissions.join(' ');
};