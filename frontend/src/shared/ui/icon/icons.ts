import { type Component, defineComponent, h } from "vue";

type Shape = [tag: "path" | "rect" | "circle", attrs: Record<string, string | number>];

/**
 * Единый набор линейных иконок TASKO (сетка 24×24, штрих 1.75).
 * Имена совпадают с @element-plus/icons-vue, поэтому используются как drop-in внутри <el-icon>.
 */
function createIcon(name: string, shapes: Shape[], filled = false): Component {
	return defineComponent({
		name,
		setup: () => () =>
			h(
				"svg",
				{
					xmlns: "http://www.w3.org/2000/svg",
					viewBox: "0 0 24 24",
					width: "1em",
					height: "1em",
					fill: filled ? "currentColor" : "none",
					stroke: filled ? "none" : "currentColor",
					"stroke-width": 1.75,
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
					focusable: "false",
				},
				shapes.map(([tag, attrs]) => h(tag, attrs)),
			),
	});
}

const p = (d: string): Shape => ["path", { d }];
const c = (cx: number, cy: number, r: number, extra: Record<string, string | number> = {}): Shape => [
	"circle",
	{ cx, cy, r, ...extra },
];
const r = (x: number, y: number, width: number, height: number, rx = 2): Shape => ["rect", { x, y, width, height, rx }];

const STAR = "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.6 3 1.1-6.2L3 9.6l6.2-.9z";
const USER_BODY = "M4 21c0-4 3.6-7 8-7s8 3 8 7";

export const ArrowLeft = createIcon("ArrowLeft", [p("M19 12H5"), p("M12 19l-7-7 7-7")]);
export const Close = createIcon("Close", [p("M18 6L6 18"), p("M6 6l12 12")]);
export const Plus = createIcon("Plus", [p("M12 5v14"), p("M5 12h14")]);
export const Search = createIcon("Search", [c(11, 11, 7), p("M20 20l-3.5-3.5")]);
export const Filter = createIcon("Filter", [p("M3 5h18l-7 8v6l-4 2v-8z")]);
export const Menu = createIcon("Menu", [p("M4 6h16"), p("M4 12h16"), p("M4 18h10")]);
export const List = createIcon("List", [
	p("M8 6h13"),
	p("M8 12h13"),
	p("M8 18h13"),
	p("M3.5 6h.01"),
	p("M3.5 12h.01"),
	p("M3.5 18h.01"),
]);
export const Board = createIcon("Board", [
	r(3, 4, 18, 16, 3),
	p("M9 4v16"),
	p("M15 4v16"),
	p("M6 8h.01"),
	p("M12 8h.01"),
]);
export const Grid = createIcon("Grid", [r(3, 3, 7, 9, 2), r(14, 3, 7, 5, 2), r(14, 12, 7, 9, 2), r(3, 16, 7, 5, 2)]);
export const PieChart = createIcon("PieChart", [p("M21 12a9 9 0 1 1-9-9v9z"), p("M15.5 3.4A9 9 0 0 1 20.6 8.5H15.5z")]);
export const Folder = createIcon("Folder", [
	p("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
]);
export const CircleCheck = createIcon("CircleCheck", [c(12, 12, 9), p("M8 12.5l3 3 5-6")]);
export const CircleCheckFilled = createIcon(
	"CircleCheckFilled",
	[c(12, 12, 10), ["path", { d: "M7.8 12.5l3 3 5.4-6.2", stroke: "#fff", "stroke-width": 2, fill: "none" }]],
	true,
);
export const Setting = createIcon("Setting", [
	p("M4 7h10"),
	p("M18 7h2"),
	c(16, 7, 2),
	p("M4 17h2"),
	p("M10 17h10"),
	c(8, 17, 2),
]);
export const User = createIcon("User", [c(12, 8, 4), p(USER_BODY)]);
export const UserFilled = createIcon(
	"UserFilled",
	[c(12, 8, 4.5), p("M3.5 21c0-4.2 3.8-7 8.5-7s8.5 2.8 8.5 7z")],
	true,
);
export const Star = createIcon("Star", [p(STAR)]);
export const StarFilled = createIcon("StarFilled", [p(STAR)], true);
export const Bell = createIcon("Bell", [p("M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"), p("M10.3 21a2 2 0 0 0 3.4 0")]);
export const SwitchButton = createIcon("SwitchButton", [
	p("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"),
	p("M16 17l5-5-5-5"),
	p("M21 12H9"),
]);
export const Expand = createIcon("Expand", [r(3, 4, 18, 16, 3), p("M9 4v16"), p("M14 10l2 2-2 2")]);
export const Fold = createIcon("Fold", [r(3, 4, 18, 16, 3), p("M9 4v16"), p("M16 10l-2 2 2 2")]);
export const Lock = createIcon("Lock", [r(4, 11, 16, 10, 2.5), p("M8 11V7a4 4 0 0 1 8 0v4")]);
export const Unlock = createIcon("Unlock", [r(4, 11, 16, 10, 2.5), p("M8 11V7a4 4 0 0 1 7.5-2")]);
export const Edit = createIcon("Edit", [p("M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"), p("M14 7l3 3")]);
export const Delete = createIcon("Delete", [
	p("M4 7h16"),
	p("M10 11v6"),
	p("M14 11v6"),
	p("M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"),
	p("M9 7V4h6v3"),
]);
export const MoreFilled = createIcon("MoreFilled", [c(5, 12, 1.7), c(12, 12, 1.7), c(19, 12, 1.7)], true);
export const Clock = createIcon("Clock", [c(12, 12, 9), p("M12 7v5l3 2")]);
export const Memo = createIcon("Memo", [
	p("M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"),
	p("M14 3v5h5"),
	p("M9 13h6"),
	p("M9 17h4"),
]);
export const Warning = createIcon("Warning", [
	p("M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"),
	p("M12 9v4"),
	p("M12 17h.01"),
]);
