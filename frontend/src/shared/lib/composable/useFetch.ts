import type { AxiosError, AxiosResponse } from "axios";
import { computed, readonly, ref, unref, watch, type MaybeRef } from "vue";

import { isMethod } from "@/shared/api/helpers/isMethod";

type Selector<Root, State> = string | ((root: Root) => State);

export interface IProvidedParams {
	pathParams?: Record<string, string | number | boolean | null | undefined>;
	params?: Record<string, string | number | boolean | null | undefined>;
	payload?: unknown;
}

export interface IFetchOptions<Root, State> {
	immediate?: boolean;
	autoFetch?: boolean;
	autoCancel?: boolean;
	params?: MaybeRef<IProvidedParams["params"]>;
	pathParams?: MaybeRef<IProvidedParams["pathParams"]>;
	initValue?: State;
	resetOnFetch?: boolean;
	onError?: (error: AxiosError) => void;
	onSuccess?: (payload: { state: State; response: AxiosResponse<Root> }) => void;
}

function pickBySelector<Root, State>(data: Root, selector?: Selector<Root, State>, url?: string): State {
	if (typeof selector === "function") {
		return selector(data);
	}

	if (typeof selector === "string") {
		const value = selector.split(".").reduce<unknown>((acc, key) => {
			if (acc && typeof acc === "object" && key in acc) {
				return (acc as Record<string, unknown>)[key];
			}
			return undefined;
		}, data);

		if (value === undefined) {
			console.error(`Selector key ${selector} not found in`, data, url);
		}

		return value as State;
	}

	if (data && typeof data === "object" && "data" in data) {
		return (data as { data: State }).data;
	}

	return data as unknown as State;
}

export function useFetch<State = any, Root = any>(
	fn: MaybeRef<(...args: any[]) => Promise<AxiosResponse<Root>>>,
	selector?: Selector<Root, State> | IFetchOptions<Root, State>,
	options?: IFetchOptions<Root, State>,
) {
	const actualOptions =
		typeof selector === "string" || typeof selector === "function" || selector == null
			? options || {}
			: selector;
	const actualSelector =
		typeof selector === "string" || typeof selector === "function" ? selector : undefined;

	const {
		immediate = false,
		autoFetch = true,
		autoCancel = false,
		params,
		pathParams,
		initValue,
		resetOnFetch = false,
		onError,
		onSuccess,
	} = actualOptions;

	const state = ref<State | undefined>(initValue);
	const root = ref<Root>();
	const isLoading = ref(Boolean(immediate));
	const isTouched = ref(false);
	const errors = ref<AxiosError | null>(null);

	let controller: AbortController | null = null;
	let fetchSeq = 0;

	if (autoFetch && (params || pathParams)) {
		watch(
			() => [unref(params), unref(pathParams)],
			() => {
				fetch().catch(() => false);
			},
			{ deep: true },
		);
	}

	async function fetch(override: IProvidedParams = {}) {
		const requestId = ++fetchSeq;

		if (autoCancel) {
			controller?.abort();
		}

		controller = new AbortController();
		isLoading.value = true;
		errors.value = null;
		if (resetOnFetch) {
			state.value = initValue;
		}

		try {
			const merged: IProvidedParams = {
				pathParams: { ...unref(pathParams), ...override.pathParams },
				params: { ...unref(params), ...override.params },
				payload: override.payload,
			};

			const requestFn = unref(fn);
			const response = isMethod(requestFn)
				? await requestFn(
						merged.pathParams || {},
						merged.params || {},
						merged.payload,
						controller.signal,
					)
				: await requestFn(merged);

			const nextState = pickBySelector(response.data, actualSelector, response.config?.url);
			state.value = nextState;
			root.value = response.data;
			isTouched.value = true;
			onSuccess?.({ state: nextState, response });
			return nextState;
		} catch (error) {
			if ((error as AxiosError).code === "ERR_CANCELED") {
				return null;
			}

			errors.value = error as AxiosError;
			onError?.(error as AxiosError);
			throw error;
		} finally {
			if (requestId === fetchSeq) {
				isLoading.value = false;
			}
		}
	}

	function reset() {
		fetchSeq += 1;
		state.value = initValue;
		root.value = undefined;
		errors.value = null;
		isLoading.value = false;
		isTouched.value = false;
		controller?.abort();
	}

	if (immediate) {
		fetch().catch(() => false);
	}

	return {
		state,
		root,
		isLoading: readonly(isLoading),
		isTouched: readonly(isTouched),
		errors,
		fetch,
		reset,
		requestParams: computed(() => ({
			...unref(params),
			...unref(pathParams),
		})),
	};
}

export default useFetch;
