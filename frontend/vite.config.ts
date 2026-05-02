import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
// @ts-expect-error — no bundled types for postcss subpath
import pandacss from '@pandacss/dev/postcss'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  css: {
    postcss: {
      plugins: [pandacss()],
    },
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
