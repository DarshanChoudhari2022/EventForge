/**
 * ZodValidationPipe — validates request bodies against a Zod schema.
 *
 * Used instead of class-validator to keep the API and web app on the same
 * Zod schemas exported from @eventforge/domain.
 */
import {
  PipeTransform,
  BadRequestException,
  Injectable,
  Inject,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(@Inject(ZodSchema) private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(formatZodError(parsed.error));
    }
    return parsed.data;
  }
}

function formatZodError(error: ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
