/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = class FancyPromise extends Promise {
  static defer() {
    let resolve, reject;

    return {
      promise: new Promise((...args) => {
        [resolve, reject] = args;
      }),
      resolve,
      reject,
    };
  }

  static async delay(timeout, value) {
    const result = await value;
    return new Promise(resolve => {
      setTimeout(() => resolve(result), timeout);
    });
  }

  static async each(iterable, callback) {
    const result = [];

    for (const item of iterable) {
      await callback(item, result.length, iterable.length);
      result.push(item);
    }

    return result;
  }

  static async mapSeries(iterable, callback) {
    const result = [];

    for (const item of iterable) {
      result.push(await callback(item, result.length, iterable.length));
    }

    return result;
  }

  static method(fn) {
    assertFunction(fn, 'method');

    return async (...args) => {
      return await fn(...args);
    };
  }

  static promisify(fn, { context, multiArgs = false } = {}) {
    assertFunction(fn, 'promisify');

    return function(...args) {
      return new Promise((resolve, reject) => {
        fn.call(context || this, ...args, (error, ...callbackArgs) => {
          if (error) {
            reject(error);
          } else {
            resolve(multiArgs ? callbackArgs : callbackArgs[0]);
          }
        });
      });
    };
  }

  static promisifyAll(
    target,
    { context, multiArgs = false, suffix = 'Async' } = {}
  ) {
    for (const [name, fn] of Object.entries(target)) {
      if (
        typeof fn === 'function' &&
        name[0] !== '_' &&
        name !== 'constructor'
      ) {
        target[`${name}${suffix}`] = FancyPromise.promisify(fn, {
          context,
          multiArgs,
        });
      }
    }
  }

  static async props(object) {
    let result;

    if (object instanceof Map) {
      result = new Map();
      await FancyPromise.all(
        Array.from(object.entries()).map(async ([key, value]) => {
          result.set(key, await value);
          return value;
        })
      );
    } else {
      result = {};
      await FancyPromise.all(
        Object.entries(object).map(async ([key, value]) => {
          result[key] = await value;
          return value;
        })
      );
    }

    return result;
  }

  static async using(...args) {
    const fn = args.pop();

    assertFunction(fn, 'using');

    const { disposers, promises } = args.reduce(
      (unpackedArgs, arg) => {
        if (
          arg._promise instanceof FancyPromise &&
          typeof arg._dispose === 'function'
        ) {
          unpackedArgs.disposers.push(arg._dispose);
          unpackedArgs.promises.push(arg._promise);
        } else {
          unpackedArgs.disposers.push(null);
          unpackedArgs.promises.push(arg);
        }

        return unpackedArgs;
      },
      { disposers: [], promises: [] }
    );

    args = await FancyPromise.all(promises);

    return FancyPromise.method(fn)(...args).finally(() =>
      FancyPromise.all(
        disposers.map((disposer, index) => disposer(args[index]))
      )
    );
  }

  disposer(fn) {
    return {
      _dispose: fn,
      _promise: this,
    };
  }
};

function assertFunction(thing, caller) {
  if (typeof thing !== 'function') {
    throw new TypeError(`argument to Promise.${caller} must be a function`);
  }
}
