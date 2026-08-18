import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Cross-field date check: the decorated property (if present) must
 * not be before `relatedField` (if also present in the same
 * payload). Skips silently when either side is absent — a PATCH that
 * only touches one of the two fields is validated against persisted
 * state by the domain layer (Asset.updateDetails), which is the only
 * place that has both values for a partial update.
 */
export function IsOnOrAfterField(
  relatedField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOnOrAfterField',
      target: object.constructor,
      propertyName,
      constraints: [relatedField],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [related] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[related];
          if (value == null || relatedValue == null) return true;
          const a = new Date(value as string);
          const b = new Date(relatedValue as string);
          if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true;
          return a.getTime() >= b.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          const [related] = args.constraints as [string];
          return `${args.property} cannot precede ${related}`;
        },
      },
    });
  };
}
