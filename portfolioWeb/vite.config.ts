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
})
