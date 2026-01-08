/**
 * Decorator that binds the method to the instance.
 */
export function autobind(
  _target: unknown,
  key: string,
  descriptor: PropertyDescriptor,
) {
  const original = descriptor.value;

  return {
    configurable: true,
    get(this: unknown) {
      const bound = original.bind(this);

      Object.defineProperty(this, key, {
        value: bound,
        configurable: true,
        writable: true,
      });

      return bound;
    },
  };
}

export default autobind;
