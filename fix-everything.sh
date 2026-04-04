#!/bin/bash
echo "=== REPARARE COMPLETĂ ==="

# 1. Creează package.json
cat > package.json << 'EOF'
{
  "name": "app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.1.4",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0"
  }
}
EOF

# 2. Mută fișierele corect
if [ -d "src/app/app" ]; then
  mv src/app/app/layout.tsx src/app/dashboard-layout.tsx
  mv src/app/app/page.tsx src/app/dashboard.tsx
  mv src/app/app/campaigns src/app/
  rm -rf src/app/app
fi

# 3. Creează tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "baseUrl": ".",
    "paths": {"@/*": ["./src/*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 4. Șterge cache
rm -rf .next node_modules pnpm-lock.yaml

# 5. Instalează
pnpm install

# 6. Pornește server
pnpm dev
