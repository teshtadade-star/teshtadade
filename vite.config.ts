import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-entry-resolver',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html
              .replace(
                /<script type="module" crossorigin src="\.\/assets\/app\.js"><\/script>/g,
                '<script type="module" src="/src/main.tsx"></script>'
              )
              .replace(
                /<link rel="stylesheet" crossorigin href="\.\/assets\/app\.css">\s*/g,
                ''
              );
          },
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/app.js',
          assetFileNames: 'assets/app.[ext]',
        },
      },
    },
  };
});
