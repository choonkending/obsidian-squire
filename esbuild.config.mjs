import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { copyFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const prod = (process.argv[2] === "production");

const wasmFiles = [
	"ort-wasm-simd-threaded.wasm",
];

const wasmCopyPlugin = {
	name: "copy-wasm",
	setup(build) {
		build.onEnd(() => {
			const srcDir = resolve("node_modules/onnxruntime-web/dist");
			const destDir = resolve(".");
			for (const f of wasmFiles) {
				const src = resolve(srcDir, f);
				const dest = resolve(destDir, f);
				if (existsSync(src)) {
					copyFileSync(src, dest);
				} else {
					console.warn(`WASM file not found: ${src}`);
				}
			}
		});
	},
};

const inlineMjsPlugin = {
	name: "inline-mjs",
	setup(build) {
		build.onResolve({ filter: /^@inline\/wasm-mjs$/ }, (args) => ({
			path: args.path,
			namespace: "inline-mjs",
		}));
		build.onLoad({ filter: /.*/, namespace: "inline-mjs" }, () => {
			const mjsPath = resolve("node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs");
			const content = readFileSync(mjsPath, "utf-8");
			const patched = content.replace(/globalThis\.process\?\.versions\?\.node/g, "false");
			return {
				contents: `export const mjsText = ${JSON.stringify(patched)};`,
				loader: "js",
			};
		});
	},
};

const transformersWebPlugin = {
	name: "transformers-web",
	setup(build) {
		build.onResolve({ filter: /^@huggingface\/transformers$/ }, () => {
			return {
				path: resolve("node_modules/@huggingface/transformers/dist/transformers.web.js"),
			};
		});
		build.onLoad({ filter: /transformers\.web\.js$/ }, (args) => {
			const content = readFileSync(args.path, "utf-8");
			const patches = [
				{ from: "if (ORT_SYMBOL in globalThis) {", to: "if (false) {" },
				{ from: 'IS_PROCESS_AVAILABLE && process?.release?.name === "node" && !IS_DENO_WEB_RUNTIME', to: "false" },
				{ from: 'const isNode = typeof process !== "undefined" && process?.release?.name === "node"', to: "const isNode = false" },
			];
			let result = content;
			for (const { from, to } of patches) {
				if (!result.includes(from)) {
					throw new Error(
						`[transformers-web] Patch failed: pattern not found in transformers.web.js\n` +
						`  Pattern: ${from}`
					);
				}
				result = result.replaceAll(from, to);
			}
			return { contents: result, loader: "js" };
		});
	},
};

const inlineWorkerPlugin = {
	name: "inline-worker",
	setup(build) {
		build.onResolve({ filter: /\.worker$/ }, (args) => ({
			path: resolve(args.resolveDir, args.path),
			namespace: "worker",
		}));
		build.onLoad({ filter: /indexer\.worker$/, namespace: "worker" }, async (args) => {
			const result = await esbuild.build({
				entryPoints: [args.path],
				bundle: true,
				format: "iife",
				target: "es2020",
				minify: prod,
				external: ["obsidian", "electron"],
				plugins: [transformersWebPlugin],
				write: false,
			});
			const code = result.outputFiles[0].text;
			return {
				contents: [
					`var _workerCode = ${JSON.stringify(code)};`,
					`var _blob = new Blob([_workerCode], { type: "application/javascript" });`,
					`export var workerUrl = URL.createObjectURL(_blob);`,
				].join("\n"),
				loader: "js",
			};
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"fs",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	minify: prod,
	plugins: [wasmCopyPlugin, inlineMjsPlugin, transformersWebPlugin, inlineWorkerPlugin],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
