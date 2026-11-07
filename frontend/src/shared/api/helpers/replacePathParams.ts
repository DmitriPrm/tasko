export const replacePathParams = (
	url: string,
	params: Record<string, string | number | boolean | null | undefined>,
) => {
	if (!params) return url;

	return url
		.split("/")
		.map((part) => {
			if (part.startsWith(":")) {
				const key = part.slice(1);
				if (key in params && params[key] != undefined && params[key] != null) {
					return String(params[key]);
				}
				throw new Error(`Invalid params: param ${key} is not provided`);
			}

			return part;
		})
		.join("/");
};
