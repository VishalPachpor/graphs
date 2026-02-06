export const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const isValidAddress = (addr: string) =>
    /^0x[a-fA-F0-9]{40}$/.test(addr);
