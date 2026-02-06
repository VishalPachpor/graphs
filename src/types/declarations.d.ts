// iOS WKWebView bridge: native app listens for itemTapped
declare global {
    interface Window {
        webkit?: {
            messageHandlers?: {
                itemTapped?: { postMessage: (payload: { nodeId: string }) => void };
            };
        };
    }
}

declare module 'react-force-graph-3d' {
    import { ComponentType } from 'react';
    const ForceGraph3D: ComponentType<any>;
    export default ForceGraph3D;
}

declare module 'react-force-graph-2d' {
    import { ComponentType } from 'react';
    const ForceGraph2D: ComponentType<any>;
    export default ForceGraph2D;
}

declare module 'three-spritetext' {
    class SpriteText {
        constructor(text?: string);
        text: string;
        textHeight: number;
        color: string;
        backgroundColor: string | false;
        padding: number;
        borderRadius: number;
    }
    export default SpriteText;
}

export {};
