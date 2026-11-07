/// <reference types="vite/client" />

declare module "vue" {
	export interface GlobalComponents {
		BaseFlex: (typeof import("@/shared/ui/flex/BaseFlex.vue"))["default"];
		BaseButton: (typeof import("@/shared/ui/button/BaseButton.vue"))["default"];
		BaseAvatar: (typeof import("@/shared/ui/avatar/BaseAvatar.vue"))["default"];
		BaseTable: (typeof import("@/shared/ui/table/BaseTable.vue"))["default"];
	}
}

declare module "vue-router" {
	interface RouteMeta {
		parent?: string;
	}
}

interface ImportMetaEnv {
	readonly VITE_APP_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

export {};
