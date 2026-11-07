import type { AxiosInstance, AxiosProgressEvent, AxiosPromise } from "axios";
import type { z } from "zod";

export interface ICreateApiOptions<Response extends z.ZodType, Request extends z.ZodType> {
	path: string;
	method: string;
	type: Response | null;
	reqType?: Request;
	instance?: AxiosInstance;
}

export interface IApiMethod<BodyType extends z.ZodType, Request extends z.ZodType> {
	method: string;
	path: string;
	type: BodyType | null;
	reqType: Request;
}

export interface ITransferCallbacks {
	onUploadProgress?: (event: AxiosProgressEvent) => void;
	onDownloadProgress?: (event: AxiosProgressEvent) => void;
}

export type TFnWithMethodParams = [
	pathParams?: Record<string, string | number | boolean | null | undefined>,
	params?: Record<string, string | number | boolean | null | undefined>,
	payload?: unknown,
	signal?: AbortSignal,
	transferCallbacks?: ITransferCallbacks,
];

export type TFnWithMethod<
	BodyType extends z.ZodType = z.ZodUnknown,
	Request extends z.ZodType = z.ZodUnknown,
> = {
	(...args: TFnWithMethodParams): AxiosPromise<z.infer<BodyType>>;
	method: IApiMethod<BodyType, Request>;
};
