import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", "node_modules", "coverage"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	...pluginVue.configs["flat/recommended"],
	{
		files: ["**/*.vue"],
		languageOptions: { parserOptions: { parser: tseslint.parser } },
	},
	{
		languageOptions: { globals: { ...globals.browser } },
		rules: {
			// API-слой и таблицы работают с произвольными строками ответа
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			// Имена страниц (DashboardPage, BaseCard) уже составные; однословные App/BaseFlex допустимы
			"vue/multi-word-component-names": "off",
			"vue/require-default-prop": "off",
			// Глобальные типы (HTMLElementTagNameMap и т. п.) проверяет TypeScript
			"no-undef": "off",
		},
	},
	{
		// Объявления типов расширяют глобальные интерфейсы, «неиспользуемость» здесь норма
		files: ["**/*.d.ts"],
		rules: { "@typescript-eslint/no-unused-vars": "off" },
	},
	prettier,
);
