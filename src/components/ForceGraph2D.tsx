'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode } from '@/types/graph';

const ForceGraph = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Known protocol/exchange logos
const PROTOCOL_LOGOS: Record<string, string> = {
    '0x28c6c06298d514db089934071355e5743bf21d60': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
};

interface Props {
    graphData: GraphData;
    onNodeClick: (node: GraphNode) => void;
}

export default function ForceGraph2D({ graphData, onNodeClick }: Props) {
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
    const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load images for main node and protocols
    useEffect(() => {
        graphData.nodes.forEach((node) => {
            if (images[node.id]) return;

            const isMain = node.type === 'main';
            const protocolLogo = PROTOCOL_LOGOS[node.id.toLowerCase()];

            if (isMain || protocolLogo) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = isMain
                    ? `https://effigy.im/a/${node.id}.png`
                    : protocolLogo!;
                img.onload = () => {
                    setImages((prev) => ({ ...prev, [node.id]: img }));
                };
            }
        });
    }, [graphData.nodes, images]);

    // Customize force engine
    useEffect(() => {
        if (fgRef.current) {
            // Stronger repulsion to separate nodes
            fgRef.current.d3Force('charge').strength(-300).distanceMax(400);

            // Adjust link distance
            fgRef.current.d3Force('link').distance(70);

            // Prevent overlap
            fgRef.current.d3Force('collision',
                // @ts-ignore
                window.d3?.forceCollide ? window.d3.forceCollide(20) : null
            );
        }
    }, [graphData]);

    const handleClick = useCallback(
        (node: any) => {
            if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 500);
                fgRef.current.zoom(2.5, 500);
            }
            onNodeClick(node);
        },
        [onNodeClick]
    );

    // 0xPPL-style node rendering
    const nodeCanvasObject = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const isMain = node.type === 'main';
            const radius = isMain ? 14 : 8;
            const shortLabel = node.id.slice(-4).toUpperCase();
            const protocolLogo = PROTOCOL_LOGOS[node.id.toLowerCase()];
            const img = images[node.id];

            // Draw grey circle background
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isMain ? '#1a1a2e' : '#2a2a3a';
            ctx.fill();

            // Draw border
            ctx.strokeStyle = isMain ? '#3b82f6' : '#444';
            ctx.lineWidth = isMain ? 2 : 1;
            ctx.stroke();

            // Draw image if available (main node or protocol)
            if (img) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius - 2, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(
                    img,
                    node.x - (radius - 2),
                    node.y - (radius - 2),
                    (radius - 2) * 2,
                    (radius - 2) * 2
                );
                ctx.restore();
            } else if (!protocolLogo) {
                // Draw short label for regular nodes
                const fontSize = Math.max(radius * 0.7, 3);
                ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#888';
                ctx.fillText(shortLabel, node.x, node.y);
            }
        },
        [images]
    );

    // Format value for display
    const formatValue = (value: number | undefined): string => {
        if (!value || value === 0) return '';
        if (value > 1e12) value = value / 1e18;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
    };

    // Clean tooltip
    const nodeLabel = useCallback((node: any) => {
        const formattedValue = formatValue(node.value);
        return `
            <div style="
                background: rgba(10, 10, 15, 0.95);
                color: white;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid #333;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
            ">
                <div style="font-weight: 600; margin-bottom: 4px;">${node.label}</div>
                <div style="color: #666; font-size: 10px; text-transform: uppercase;">${node.type || 'wallet'}</div>
                ${formattedValue ? `<div style="color: #22c55e; margin-top: 4px;">${formattedValue}</div>` : ''}
            </div>
        `;
    }, []);

    return (
        <ForceGraph
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeCanvasObject={nodeCanvasObject}
            nodeLabel={nodeLabel}

            // 0xPPL-style thin grey links
            linkColor={() => '#333'}
            linkWidth={0.5}

            // No particles
            linkDirectionalParticles={0}

            onNodeClick={handleClick}
            backgroundColor="#000000"

            // Organic force layout
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
        />
    );
}
