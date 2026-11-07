import { createI18n } from "vue-i18n";

import { en } from "@/shared/lib/theming/i18n/en";
import { ru } from "@/shared/lib/theming/i18n/ru";

const savedLocale = localStorage.getItem("tasko-locale") === "en" ? "en" : "ru";

export const i18n = createI18n({
	legacy: false,
	locale: savedLocale,
	fallbackLocale: "ru",
	messages: { ru, en },
});

export function translate(key: string) {
	return String(i18n.global.t(key));
}

export function setLocale(locale: "ru" | "en") {
	i18n.global.locale.value = locale;
	localStorage.setItem("tasko-locale", locale);
}
