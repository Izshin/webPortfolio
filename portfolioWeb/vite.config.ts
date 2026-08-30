import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project site from /<repo>/; set to '/' for a custom domain.
  base: '/webPortfolio/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three/r3f/drei churn far less often than app code, so splitting them into their
        // own chunk lets repeat visitors reuse the cached chunk across deploys.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/@react-three')) return 'r3f'
          if (id.includes('node_modules/framer-motion')) return 'motion'
        },
      },
    },
  },
})
