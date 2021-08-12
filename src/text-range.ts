export type NodeRange = {
  node: Node;
  start: number;
  end: number;
};

export type TextRange = Array<NodeRange>;
