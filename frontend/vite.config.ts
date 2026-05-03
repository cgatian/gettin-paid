import pandacss from '@pandacss/dev/postcss';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
} as UserConfig);
