type AbstractConstructor<T = object> = abstract new (...args: never[]) => T;

export function PartialType<TBase extends object>(
  classRef: AbstractConstructor<TBase>,
): AbstractConstructor<Partial<TBase>> {
  abstract class PartialClass {}

  Object.defineProperty(PartialClass, 'name', {
    value: `Partial${classRef.name}`,
  });

  return PartialClass as AbstractConstructor<Partial<TBase>>;
}
