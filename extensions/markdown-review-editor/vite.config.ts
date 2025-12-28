import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	plugins: [svelte() as any],
	build: {
		outDir: 'dist/webview',
		emptyOutDir: true,
		rollupOptions: {
			input: resolve(__dirname, 'src/webview/main.ts'),
			output: {
				entryFileNames: 'index.js',
				assetFileNames: 'index.[ext]'
			}
		}
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src/lib')
		}
	},
	test: {
		include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom'
	}
});
