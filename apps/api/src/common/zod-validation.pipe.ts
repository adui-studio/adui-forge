import { ArgumentMetadata, BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** 用 Zod 校验请求体的 Nest Pipe（仓库统一 Zod，不引入 class-validator）。 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new BadRequestException(`validation failed — ${issues}`);
    }
    return result.data;
  }
}
