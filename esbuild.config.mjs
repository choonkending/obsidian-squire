import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { copyFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const prod = (process.argv[2] === "production");

const wasmFiles = [
	"ort-wasm-simd-threaded.jsep.wasm",
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
