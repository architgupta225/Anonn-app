import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { obfuscator } from 'rollup-plugin-obfuscator';

export default defineConfig({
  plugins: [
    react(),
    // Code obfuscation for production
    obfuscator({
      // Advanced obfuscation options
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 1,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 1,
      debugProtection: true,
      debugProtectionInterval: 4000,
      disableConsoleOutput: true,
      domainLock: ['localhost', '127.0.0.1', 'https://regulations-did-firm-qualified.trycloudflare.com'],
      identifierNamesGenerator: 'hexadecimalNumber',
      log: false,
      numbersToExpressions: true,
      renameGlobals: false,
      selfDefending: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 5,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayCallsTransformThreshold: 1,
      stringArrayEncoding: ['rc4'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 5,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 5,
      stringArrayWrappersType: 'function',
      stringArrayThreshold: 1,
      unicodeEscapeSequence: false,
      transformObjectKeys: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  root: 'client',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: false, // Disable source maps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 3, // Multiple compression passes
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
      },
      mangle: {
        properties: {
          regex: /^_/, // Mangle private properties
        },
        toplevel: true,
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    rollupOptions: {
      output: {
        // Hide chunk names
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks: {
          // Split vendor libraries
          vendor: ['react', 'react-dom'],
          crypto: ['crypto-js'],
          utils: ['lodash', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  define: {
    // Remove development flags
    __DEV__: false,
    'process.env.NODE_ENV': '"production"',
  },
  server: {
    host: true,
    port: 5173,
  },
});
