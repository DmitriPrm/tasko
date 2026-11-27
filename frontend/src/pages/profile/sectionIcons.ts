import type { Component } from "vue";

import { Award, Book, Briefcase, Code, Flag, Globe, Heart, Phone, Star, User } from "@/shared/ui/icon/icons";

/** Иконки разделов профиля. Коды совпадают с SECTION_ICONS на сервере */
export const SECTION_ICONS: Record<string, Component> = {
	award: Award,
	star: Star,
	briefcase: Briefcase,
	book: Book,
	code: Code,
	phone: Phone,
	globe: Globe,
	heart: Heart,
	user: User,
	flag: Flag,
};

export const SECTION_ICON_KEYS = Object.keys(SECTION_ICONS);

/** Иконка по умолчанию — нарисованная медаль */
export const DEFAULT_SECTION_ICON = "award";

const GUESSES: [RegExp, string][] = [
	[/достиж|наград|achiev|award/i, "award"],
	[/навык|умени|skill|компетен/i, "star"],
	[/опыт|работ|карьер|experience|career|job/i, "briefcase"],
	[/образов|учеб|курс|education|study|course/i, "book"],
	[/проект|код|технолог|code|stack|project/i, "code"],
	[/контакт|телефон|связ|contact|phone/i, "phone"],
	[/язык|language|город|страна|location/i, "globe"],
	[/хобби|интерес|увлеч|hobby|interest/i, "heart"],
	[/о себе|обо мне|about|bio/i, "user"],
	[/цел|план|goal|plan/i, "flag"],
];

/** Если владелец не выбрал иконку — подбираем по названию раздела, иначе медаль */
export function sectionIconKey(section: { title: string; icon?: string | null }) {
	if (section.icon && SECTION_ICONS[section.icon]) return section.icon;
	return GUESSES.find(([pattern]) => pattern.test(section.title))?.[1] ?? DEFAULT_SECTION_ICON;
}
