// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import tsparser from "@typescript-eslint/parser";
import pluginJest from "eslint-plugin-jest";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
   {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    }
  },
  {
    files: ['**/*.spec.ts'],
    plugins: { jest: pluginJest },
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    }
  },
  globalIgnores(['node_modules/', 'main.js', 'version-bump.mjs', 'jest.config.js'])
]);