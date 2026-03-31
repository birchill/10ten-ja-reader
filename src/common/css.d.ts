declare module '*.css?inline' {
  const content: string;
  export default content;
}

declare module '*.css';

declare module '*.json.src' {
  const content: unknown;
  export default content;
}
