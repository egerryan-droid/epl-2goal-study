'use client';

import { useMemo } from 'react';
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from 'd3-sankey';
import { motion } from 'framer-motion';
import { COLORS } from '@/lib/theme';
import type { SummaryBucket } from '@/lib/data';

interface SankeyFlowProps {
  data: SummaryBucket[];
}

interface NodeExtra {
  name: string;
  color?: string;
}
interface LinkExtra {
  color: string;
}

type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

const WIDTH = 700;
const HEIGHT = 420;
const MARGIN = { top: 20, right: 120, bottom: 20, left: 120 };

const OUTCOME_COLORS: Record<string, string> = {
  Win: COLORS.win,
  Draw: COLORS.draw,
  Loss: COLORS.loss,
};

export default function SankeyFlow({ data }: SankeyFlowProps) {
  const { nodes, links } = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.bucket_order - b.bucket_order);

    const nodeList: NodeExtra[] = [
      ...sorted.map((b) => ({ name: b.bucket_key })),
      { name: 'Win', color: COLORS.win },
      { name: 'Draw', color: COLORS.draw },
      { name: 'Loss', color: COLORS.loss },
    ];

    const bucketCount = sorted.length;
    const winIdx = bucketCount;
    const drawIdx = bucketCount + 1;
    const lossIdx = bucketCount + 2;

    const linkList: Array<{ source: number; target: number; value: number; color: string }> = [];

    sorted.forEach((b, i) => {
      if (b.wins > 0) linkList.push({ source: i, target: winIdx, value: b.wins, color: COLORS.win });
      if (b.draws > 0) linkList.push({ source: i, target: drawIdx, value: b.draws, color: COLORS.draw });
      if (b.losses > 0) linkList.push({ source: i, target: lossIdx, value: b.losses, color: COLORS.loss });
    });

    const layout = d3Sankey<NodeExtra, LinkExtra>()
      .nodeId((d) => (d as SNode & { index?: number }).index ?? 0)
      .nodeWidth(18)
      .nodePadding(16)
      .nodeAlign((node) => {
        const idx = (node as SNode & { index?: number }).index ?? 0;
        return idx < bucketCount ? 0 : 1;
      })
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, HEIGHT - MARGIN.bottom],
      ]);

    const graph = layout({
      nodes: nodeList.map((d) => ({ ...d })),
      links: linkList.map((d) => ({ ...d })),
    });

    return { nodes: graph.nodes as SNode[], links: graph.links as SLink[] };
  }, [data]);

  const linkPath = sankeyLinkHorizontal<SNode, SLink>();

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[500px]">
        {/* Links */}
        {links.map((link, i) => {
          const d = linkPath(link) || '';
          const color = (link as unknown as LinkExtra).color ?? COLORS.accent;
          return (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeOpacity={0.4}
              strokeWidth={Math.max(1, link.width ?? 1)}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeInOut' }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const x0 = node.x0 ?? 0;
          const y0 = node.y0 ?? 0;
          const x1 = node.x1 ?? 0;
          const y1 = node.y1 ?? 0;
          const isOutcome = !!OUTCOME_COLORS[node.name];
          const color = isOutcome
            ? OUTCOME_COLORS[node.name]
            : COLORS.accent;

          return (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <rect
                x={x0}
                y={y0}
                width={x1 - x0}
                height={y1 - y0}
                fill={color}
                rx={3}
              />
              <text
                x={isOutcome ? x1 + 8 : x0 - 8}
                y={(y0 + y1) / 2}
                textAnchor={isOutcome ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs fill-gray-300 font-medium"
              >
                {node.name}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
