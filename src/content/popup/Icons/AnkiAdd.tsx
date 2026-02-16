/**
 * "+" icon for adding an Anki card.
 */
export function AnkiAdd({ color }: { color?: string }) {
  return (
    <svg
      class="tp:inline-block tp:w-[16px] tp:h-[16px] tp:fill-current tp:opacity-70 tp:hover:opacity-100 tp:cursor-pointer tp:shrink-0"
      viewBox="0 0 24 24"
      aria-label="Add to Anki"
      style={color ? { color } : undefined}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
    </svg>
  );
}
