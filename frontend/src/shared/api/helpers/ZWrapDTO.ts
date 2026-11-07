import { z } from "zod";

export const ZWrapDTO = <T extends z.ZodType>(data: T) => z.object({ data });
