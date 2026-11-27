import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", "node_modules", "coverage", "storage", "prisma/migrations", "*.js"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: { globals: { ...globals.node, ...globals.jest } },
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			// В тестах сервисы получают моки через приведение типов
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
	prettier,
);
