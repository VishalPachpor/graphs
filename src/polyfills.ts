if (typeof globalThis !== 'undefined') {
    // Check if localStorage is broken (exists but getItem is not a function)
    const isBroken =
        typeof (globalThis as any).localStorage !== 'undefined' &&
        typeof (globalThis as any).localStorage.getItem !== 'function';

    if (isBroken || typeof (globalThis as any).localStorage === 'undefined') {
        const noopStorage = {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
            clear: () => { },
            length: 0,
            key: () => null,
        };

        Object.defineProperty(globalThis, 'localStorage', {
            value: noopStorage,
            writable: true,
            configurable: true,
        });
    }
}
