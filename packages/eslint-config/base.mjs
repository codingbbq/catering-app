import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export function createBaseConfig(tsconfigRootDir) {
  return [
    {
      ignores: [
        "**/.next/**",
        "**/dist/**",
        "**/coverage/**",
        "**/node_modules/**",
        "**/playwright-report/**",
        "**/test-results/**",
        "**/*.config.*",
        "**/eslint.config.mjs"
      ]
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir
        },
        globals: {
          ...globals.node
        }
      }
    }
  ];
}
