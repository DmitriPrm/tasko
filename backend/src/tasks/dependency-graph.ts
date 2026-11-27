/** Ребро «source блокирует target» */
export interface BlockingEdge {
	sourceTaskId: string;
	targetTaskId: string;
}

/**
 * Появится ли цикл, если добавить ребро source → target.
 * Цикл есть, когда из target уже можно дойти до source по существующим блокировкам.
 */
export function wouldCreateCycle(edges: BlockingEdge[], sourceTaskId: string, targetTaskId: string) {
	if (sourceTaskId === targetTaskId) return true;

	const next = new Map<string, string[]>();
	for (const edge of edges) {
		const list = next.get(edge.sourceTaskId) ?? [];
		list.push(edge.targetTaskId);
		next.set(edge.sourceTaskId, list);
	}

	const seen = new Set<string>([targetTaskId]);
	const queue = [targetTaskId];
	while (queue.length) {
		const current = queue.shift() as string;
		for (const neighbour of next.get(current) ?? []) {
			if (neighbour === sourceTaskId) return true;
			if (seen.has(neighbour)) continue;
			seen.add(neighbour);
			queue.push(neighbour);
		}
	}
	return false;
}
