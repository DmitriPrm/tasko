import { computed, ref } from "vue";
import { defineStore } from "pinia";

const MOBILE_MAX = 768;
const STORAGE_KEY = "tasko.sidebar.collapsed";

function readCollapsed() {
	try {
		return localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

function saveCollapsed(value: boolean) {
	try {
		localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
	} catch {
		// хранилище недоступно - состояние просто не запоминается
	}
}

export const useLayoutStore = defineStore("layout", () => {
	const viewportWidth = ref(typeof window === "undefined" ? 1280 : window.innerWidth);
	const isCollapsed = ref(readCollapsed());
	const isMobileOpen = ref(false);

	const isMobile = computed(() => viewportWidth.value <= MOBILE_MAX);
	const isSidebarVisible = computed(() => (isMobile.value ? isMobileOpen.value : !isCollapsed.value));

	const handleResize = () => {
		viewportWidth.value = window.innerWidth;
		if (!isMobile.value) {
			isMobileOpen.value = false;
		}
	};

	if (typeof window !== "undefined") {
		window.addEventListener("resize", handleResize);
	}

	const toggle = () => {
		if (isMobile.value) {
			isMobileOpen.value = !isMobileOpen.value;
			return;
		}
		isCollapsed.value = !isCollapsed.value;
		saveCollapsed(isCollapsed.value);
	};

	const closeMobile = () => {
		isMobileOpen.value = false;
	};

	return {
		isCollapsed,
		isMobileOpen,
		isMobile,
		isSidebarVisible,
		toggle,
		closeMobile,
	};
});
