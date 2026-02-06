if (typeof global !== 'undefined') {
    // Check if localStorage is broken (exists but getItem is not a function)
    const isBroken =
        typeof global.localStorage !== 'undefined' &&
        typeof global.localStorage.getItem !== 'function';

    if (isBroken || typeof global.localStorage === 'undefined') {
        const noopStorage = {
            getItem: (_key: string) => null,
            setItem: (_key: string, _value: string) => { },
            removeItem: (_key: string) => { },
            clear: () => { },
            length: 0,
            key: (_index: number) => null,
        };

        Object.defineProperty(global, 'localStorage', {
            value: noopStorage,
            writable: true,
            configurable: true,
        });
    }
}
