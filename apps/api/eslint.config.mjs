import { defineConfig } from "eslint/config";
import { createBaseConfig } from "@catering/eslint-config/base";

export default defineConfig([...createBaseConfig(import.meta.dirname)]);
