import type { AxiosInstance } from "axios";
import { ElMessage } from "element-plus";
import { z } from "zod";

import type { IApiMethod, ICreateApiOptions, TFnWithMethod } from "@/shared/api/helpers/apiTypes";
import { replacePathParams } from "@/shared/api/helpers/replacePathParams";
import { apiInstance } from "@/shared/api/v0/base";

function parseData<BodyType extends z.ZodType>(
	payload: z.input<BodyType>,
	url: string | undefined,
	type: BodyType | null,
): z.output<BodyType> {
	if (!type) return payload as z.output<BodyType>;

	const result = type.safeParse(payload);
	if (result.success) return result.data;

	if (import.meta.env.DEV) {
		ElMessage({
			type: "error",
			message: "Api schema validation failed. See console for details.",
		});
		console.error(url, payload, result.error);
	}

	return payload as z.output<BodyType>;
}

function wrapMethod<BodyType extends z.ZodType, Request extends z.ZodType>(
	method: IApiMethod<BodyType, Request>,
	instance?: AxiosInstance,
) {
	const fn: TFnWithMethod<BodyType, Request> = async (
		pathParams,
		params,
		payload,
		signal,
		transferCallbacks,
	) => {
		const interpolatedUrl = replacePathParams(method.path, pathParams ?? {});
		const res = await (instance ?? apiInstance).request<z.infer<BodyType>>({
			url: interpolatedUrl,
			method: method.method,
			params,
			data: payload,
			signal,
			onUploadProgress: transferCallbacks?.onUploadProgress,
			onDownloadProgress: transferCallbacks?.onDownloadProgress,
		});

		if (res.status === 204 || res.data == null || res.data === "") {
			return {
				...res,
				data: undefined,
			};
		}

		return {
			...res,
			data: parseData(res.data as z.input<BodyType>, res.config?.url, method.type),
		};
	};

	fn.method = method;
	return fn;
}

export function createMethod<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: ICreateApiOptions<BodyType, Request>,
): TFnWithMethod<BodyType, Request> {
	const method: IApiMethod<BodyType, Request> = {
		path: options.path,
		type: options.type,
		method: options.method,
		reqType: options.reqType as Request,
	};

	return wrapMethod(method, options.instance);
}

export function createGet<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: Omit<ICreateApiOptions<BodyType, Request>, "method">,
) {
	return createMethod({ ...options, method: "get" });
}

export function createPost<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: Omit<ICreateApiOptions<BodyType, Request>, "method">,
) {
	return createMethod({ ...options, method: "post" });
}

export function createPatch<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: Omit<ICreateApiOptions<BodyType, Request>, "method">,
) {
	return createMethod({ ...options, method: "patch" });
}

export function createPut<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: Omit<ICreateApiOptions<BodyType, Request>, "method">,
) {
	return createMethod({ ...options, method: "put" });
}

export function createDelete<BodyType extends z.ZodType, Request extends z.ZodType>(
	options: Omit<ICreateApiOptions<BodyType, Request>, "method">,
) {
	return createMethod({ ...options, method: "delete" });
}
