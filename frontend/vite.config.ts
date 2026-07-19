import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    base: '/new-monitor/',
    build: {
      outDir: '../monitor',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Split heavy third-party libs into their own cacheable chunks so the
          // main bundle stays small and vendor code isn't re-downloaded on
          // app-code changes.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
              return 'vendor-react';
            if (/[\\/]node_modules[\\/]uplot/.test(id)) return 'vendor-uplot';
            if (/[\\/]node_modules[\\/]socket\.io-client|engine\.io-client|socket\.io-parser/.test(id))
              return 'vendor-socket';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
