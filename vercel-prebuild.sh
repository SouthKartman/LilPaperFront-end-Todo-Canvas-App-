# vercel-prebuild.sh
#!/bin/bash
echo "📦 Подготовка Service Worker для Vercel..."

# Создаем service-worker.ts если его нет
if [ ! -f "src/service-worker.ts" ]; then
  cat > src/service-worker.ts << 'EOF'
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { type: 'module', scope: '/' })
        .then(reg => console.log('✅ SW registered:', reg.scope))
        .catch(err => console.error('❌ SW failed:', err));
    });
  }
}
registerServiceWorker();
EOF
  echo "✅ Создан src/service-worker.ts"
fi

# Создаем public/sw.js если его нет
if [ ! -f "public/sw.js" ]; then
  mkdir -p public
  cat > public/sw.js << 'EOF'
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
EOF
  echo "✅ Создан public/sw.js"
fi