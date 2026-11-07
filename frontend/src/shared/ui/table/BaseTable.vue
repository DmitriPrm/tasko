<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import { baseApi } from "@/shared/api/baseApi";
import { useFetch } from "@/shared/lib/composable/useFetch";
import { translate } from "@/shared/lib/theming/i18n/translate";

export interface BaseTableColumn {
	key: string;
	label: string;
	width?: string;
	sortKey?: string;
	sortable?: boolean;
}

const emit = defineEmits<{
	"row-click": [row: any];
}>();

const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 1200;

const props = withDefaults(
	defineProps<{
		rows: any[];
		columns: BaseTableColumn[];
		code: string;
		loading?: boolean;
		pageSize?: number;
		rowKey?: string;
	}>(),
	{
		pageSize: 15,
		rowKey: "id",
	},
);

const pageSizeOptions = [15, 30, 50, 75];

const page = ref(1);
const selectedPageSize = ref(props.pageSize);
const sortKey = ref("");
const sortOrder = ref<"asc" | "desc">("asc");
const widths = ref<Record<string, number>>({});
const widthsBeforeSave = ref<Record<string, number>>({});
const drag = ref<{
	key: string;
	startX: number;
	startWidth: number;
	measured: Record<string, number>;
	resized: boolean;
} | null>(null);

let saveToken = 0;
let pendingToken = 0;
let pendingSnapshot: Record<string, number> = {};

const { state: layoutState } = useFetch(baseApi.tableLayouts.getTableLayout, "data", {
	immediate: true,
	resetOnFetch: false,
	pathParams: computed(() => ({ code: props.code })),
});

const { fetch: saveLayout } = useFetch(baseApi.tableLayouts.saveTableLayout, "data", {
	immediate: false,
	autoFetch: false,
	onError: () => {
		if (pendingToken === saveToken) widths.value = { ...pendingSnapshot };
	},
});

const readPath = (row: any, path: string) => path.split(".").reduce<any>((acc, key) => acc?.[key], row);

const sortValue = (row: any, column: BaseTableColumn) => {
	const raw = column.sortKey ? readPath(row, column.sortKey) : row[column.key];
	if (raw && typeof raw === "object") {
		return raw.fullName || raw.name || raw.title || "";
	}
	return raw ?? "";
};

const sortedRows = computed(() => {
	const column = props.columns.find((item) => item.key === sortKey.value);
	if (!column || column.sortable === false) return props.rows;
	const direction = sortOrder.value === "asc" ? 1 : -1;
	return [...props.rows].sort((left, right) => {
		const a = sortValue(left, column);
		const b = sortValue(right, column);
		const emptyA = a === "" || a == null;
		const emptyB = b === "" || b == null;
		if (emptyA && emptyB) return 0;
		if (emptyA) return 1;
		if (emptyB) return -1;
		if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
		return String(a).localeCompare(String(b), "ru", { numeric: true, sensitivity: "base" }) * direction;
	});
});

const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / selectedPageSize.value)));

const visibleRows = computed(() => {
	const start = (page.value - 1) * selectedPageSize.value;
	return sortedRows.value.slice(start, start + selectedPageSize.value);
});

const pages = computed(() => Array.from({ length: pageCount.value }, (_, index) => index + 1));

watch(
	() =>
		props.rows
			.map((row) => String(row[props.rowKey]))
			.sort()
			.join("|"),
	(next, previous) => {
		if (previous != null && next !== previous) page.value = 1;
	},
);

watch(pageCount, (count) => {
	if (page.value > count) page.value = count;
});

const handleRowClick = (row: any) => emit("row-click", row);
const handlePage = (next: number) => {
	page.value = next;
};
const handlePageSize = (size: number) => {
	selectedPageSize.value = Number(size);
	page.value = 1;
};
const handleSort = (column: BaseTableColumn) => {
	if (column.sortable === false) return;
	if (sortKey.value === column.key) {
		sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
		return;
	}
	sortKey.value = column.key;
	sortOrder.value = "asc";
	page.value = 1;
};

const clampWidth = (width: number) =>
	Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));

const normalizeWidths = (value: Record<string, number> | undefined) => {
	const next: Record<string, number> = {};
	if (!value) return next;
	for (const [key, width] of Object.entries(value)) {
		if (typeof width !== "number" || !Number.isFinite(width)) continue;
		next[key] = clampWidth(width);
	}
	return next;
};

const columnStyle = (column: BaseTableColumn) => {
	const width = widths.value[column.key];
	if (width) {
		const px = `${width}px`;
		return { width: px, minWidth: px, maxWidth: px };
	}
	return column.width ? { width: column.width } : undefined;
};

const measureColumns = (table: HTMLTableElement) => {
	const cells = table.querySelectorAll("thead th");
	const measured: Record<string, number> = {};
	props.columns.forEach((column, index) => {
		measured[column.key] = clampWidth(cells[index]?.getBoundingClientRect().width ?? MIN_COLUMN_WIDTH);
	});
	return measured;
};

const sized = computed(
	() => props.columns.length > 0 && props.columns.every((column) => Boolean(widths.value[column.key])),
);

const tableStyle = computed(() => {
	if (!sized.value) return undefined;
	const total = props.columns.reduce((sum, column) => sum + (widths.value[column.key] ?? 0), 0);
	return { width: `${total}px` };
});

const handleResizeStart = (event: PointerEvent, column: BaseTableColumn) => {
	if (event.button !== 0) return;
	const handle = event.currentTarget as HTMLElement;
	const cell = handle.closest("th");
	const table = handle.closest("table");
	if (!cell || !table) return;
	const startWidth = Math.round(cell.getBoundingClientRect().width);
	widthsBeforeSave.value = { ...widths.value };
	drag.value = {
		key: column.key,
		startX: event.clientX,
		startWidth,
		measured: measureColumns(table),
		resized: false,
	};
	handle.setPointerCapture(event.pointerId);
};

const handleResizeMove = (event: PointerEvent) => {
	const current = drag.value;
	if (!current) return;
	const next = clampWidth(current.startWidth + event.clientX - current.startX);
	if (next === current.startWidth) {
		drag.value = { ...current, resized: false };
		widths.value = { ...widthsBeforeSave.value };
		return;
	}
	drag.value = { ...current, resized: true };
	widths.value = { ...current.measured, [current.key]: next };
};

const handleResizeEnd = (event: PointerEvent) => {
	const current = drag.value;
	if (!current) return;
	const handle = event.currentTarget as HTMLElement;
	if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
	const resized = current.resized;
	drag.value = null;
	if (!resized) {
		widths.value = { ...normalizeWidths(layoutState.value?.widths), ...widthsBeforeSave.value };
		return;
	}
	pendingSnapshot = { ...widthsBeforeSave.value };
	pendingToken = ++saveToken;
	saveLayout({
		pathParams: { code: props.code },
		payload: { widths: { ...widths.value } },
	}).catch(() => false);
};

watch(
	() => props.code,
	() => {
		widths.value = {};
		widthsBeforeSave.value = {};
	},
);

watch(layoutState, (layout) => {
	if (!layout || drag.value) return;
	widths.value = { ...normalizeWidths(layout.widths), ...widths.value };
});
</script>

<template>
	<section class="base-table" :class="{ 'base-table--resizing': drag }">
		<div v-if="loading && !rows.length" class="base-table__loading">{{ translate("common.loading") }}</div>
		<div class="base-table__scroll">
			<table class="base-table__grid" :class="{ 'base-table__grid--sized': sized }" :style="tableStyle">
				<colgroup>
					<col v-for="column in columns" :key="column.key" :style="columnStyle(column)" />
				</colgroup>
				<thead>
					<tr>
						<th v-for="column in columns" :key="column.key" :style="columnStyle(column)">
							<button
								v-if="column.sortable !== false"
								class="base-table__sort"
								type="button"
								@click="() => handleSort(column)"
							>
								<base-flex align="center" :gap="1">
									<span>{{ column.label }}</span>
									<span v-if="sortKey === column.key">{{ sortOrder === "asc" ? "↑" : "↓" }}</span>
								</base-flex>
							</button>
							<span v-else>{{ column.label }}</span>
							<span
								class="base-table__resize"
								:class="{ 'base-table__resize--active': drag?.key === column.key }"
								@pointerdown.stop.prevent="(event) => handleResizeStart(event, column)"
								@pointermove="handleResizeMove"
								@pointerup="handleResizeEnd"
								@pointercancel="handleResizeEnd"
							/>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="!loading && !visibleRows.length">
						<td class="base-table__empty" :colspan="columns.length">{{ translate("common.empty") }}</td>
					</tr>
					<tr
						v-for="row in visibleRows"
						:key="String(row[rowKey])"
						@click="() => handleRowClick(row)"
					>
						<td v-for="column in columns" :key="column.key">
							<slot :name="column.key" :row="row">{{ row[column.key] ?? "—" }}</slot>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<base-flex class="base-table__pager" align="center" justify="space-between" :gap="3" wrap="wrap">
			<base-flex align="center" :gap="3" wrap="wrap">
				<span>{{ page }} / {{ pageCount }}</span>
				<base-flex align="center" :gap="2">
					<span>{{ translate("common.perPage") }}</span>
					<el-select
						class="base-table__size"
						:model-value="selectedPageSize"
						@change="(size: number) => handlePageSize(size)"
					>
						<el-option
							v-for="size in pageSizeOptions"
							:key="size"
							:label="String(size)"
							:value="size"
						/>
					</el-select>
				</base-flex>
			</base-flex>
			<base-flex align="center" :gap="2">
				<button type="button" :disabled="page === 1" @click="() => handlePage(page - 1)">
					{{ translate("common.back") }}
				</button>
				<button
					v-for="item in pages"
					:key="item"
					type="button"
					:class="{ 'base-table__page--active': item === page }"
					@click="() => handlePage(item)"
				>
					{{ item }}
				</button>
				<button type="button" :disabled="page === pageCount" @click="() => handlePage(page + 1)">
					{{ translate("common.next") }}
				</button>
			</base-flex>
		</base-flex>
	</section>
</template>

<style scoped lang="scss">
@use "sass:map";
@use "@/assets/styles/maps" as *;

.base-table {
	background: var(--mt-color-white);
	border: 1px solid var(--mt-color-gray-100);
	border-radius: var(--mt-radius);
	box-shadow: var(--mt-shadow);
	overflow: hidden;

	&__scroll {
		overflow-x: auto;
	}

	&__grid {
		width: 100%;
		min-width: 560px;
		border-collapse: collapse;

		&--sized {
			width: max-content;
			min-width: 560px;
			table-layout: fixed;
		}
	}

	th,
	td {
		padding: map.get($spacers, 3) map.get($spacers, 4);
		text-align: left;
		font-size: map.get($font-sizes, 6);
	}

	th {
		position: relative;
		border-bottom: 1px solid var(--mt-color-gray-100);
		background: var(--mt-color-gray-50);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	td {
		border-bottom: 1px solid var(--mt-color-gray-100);
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	&--resizing {
		cursor: col-resize;
		user-select: none;
	}

	&__resize {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
		width: 8px;
		height: 100%;
		cursor: col-resize;
		touch-action: none;
		user-select: none;

		&::after {
			content: "";
			position: absolute;
			top: 25%;
			right: 3px;
			bottom: 25%;
			width: 2px;
			border-radius: 2px;
			background: var(--mt-color-gray-200);
			transition: background 0.15s ease;
		}

		&:hover::after,
		&--active::after {
			background: var(--mt-color-primary);
		}
	}

	&__sort {
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		cursor: pointer;

		&:hover {
			color: var(--mt-color-text);
		}
	}

	tbody tr {
		cursor: pointer;
		transition: background 0.15s ease;
	}

	tbody tr:hover {
		background: var(--mt-color-gray-50);
	}

	&__empty {
		padding: map.get($spacers, 10);
		color: var(--mt-color-gray-400);
		text-align: center;
		cursor: default;
	}

	&__loading {
		padding: map.get($spacers, 4);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 6);
	}

	&__pager {
		padding: map.get($spacers, 3) map.get($spacers, 4);
		border-top: 1px solid var(--mt-color-gray-100);
		color: var(--mt-color-gray-500);
		font-size: map.get($font-sizes, 8);

		button {
			min-width: 32px;
			padding: map.get($spacers, 1) map.get($spacers, 2);
			border: 0;
			border-radius: 8px;
			background: transparent;
			color: var(--mt-color-gray-500);
			font: inherit;
			font-weight: 500;
			cursor: pointer;
			transition: background 0.15s ease;

			&:hover:not(:disabled) {
				background: var(--mt-color-gray-50);
				color: var(--mt-color-text);
			}

			&:disabled {
				opacity: 0.4;
				cursor: default;
			}
		}

		button.base-table__page--active {
			background: var(--mt-color-primary-light);
			color: var(--mt-color-primary);
			font-weight: 700;
		}
	}

	&__size {
		width: 96px;
	}
}
</style>
