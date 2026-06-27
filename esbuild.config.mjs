import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { copyFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const prod = (process.argv[2] === "production");

const wasmFiles = [
	"ort-wasm-simd-threaded.wasm",
	"ort-wasm-simd-threaded.jsep.wasm",
	"ort-wasm-simd-threaded.jspi.wasm",
	"ort-wasm-simd-threaded.asyncify.wasm",
	"ort-wasm-simd-threaded.jsep.mjs",
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
			return {
				contents: content
					.replace(
						"if (ORT_SYMBOL in globalThis) {",
						"if (false) {"
					)
					.replace(
						'IS_PROCESS_AVAILABLE && process?.release?.name === "node" && !IS_DENO_WEB_RUNTIME',
						"false"
					)
					.replace(
						'const isNode = typeof process !== "undefined" && process?.release?.name === "node"',
						"const isNode = false"
					),
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
	plugins: [wasmCopyPlugin, transformersWebPlugin],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
