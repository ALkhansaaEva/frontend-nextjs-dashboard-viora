import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "build-deploy/**",
    ".claude/**",
    "graphify-out/**",
    "next-env.d.ts",
    // `next build` writes this standalone launcher at the repo root (and
    // deploy/Dockerfile copies it); it is generated CJS, not authored source.
    "server.js",
  ]),
]);

export default eslintConfig;
