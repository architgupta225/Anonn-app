import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: ['buffer', 'process'],
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false, // Disable source maps for security
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 3,
      },
      mangle: {
        properties: {
          regex: /^_/, // Mangle private properties
        },
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        // Obscure chunk names in production
        chunkFileNames: process.env.NODE_ENV === 'production' 
          ? 'assets/[hash].js' 
          : 'assets/[name]-[hash].js',
        entryFileNames: process.env.NODE_ENV === 'production' 
          ? 'assets/[hash].js' 
          : 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          crypto: ['crypto-js', '@fingerprintjs/fingerprintjs'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Completely disable HMR and WebSocket to prevent conflicts
    hmr: false,
    ws: false,
  },
  // Explicitly disable WebSocket for HMR to prevent conflicts
  define: {
    __VITE_HMR_PROTOCOL__: JSON.stringify('ws'),
    __VITE_HMR_HOSTNAME__: JSON.stringify('localhost'),
    __VITE_HMR_PORT__: 24678,
  },
});
