// Root ESLint flat config — applies to packages/* (plain TS packages).
// apps/web has its own eslint.config.mjs (Next.js-specific) which takes
// precedence there since flat config resolution uses the nearest config file.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.next/**"],
  }
);
