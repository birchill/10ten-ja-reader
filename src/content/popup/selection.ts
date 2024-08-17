export function containerHasSelectedText(container: HTMLElement) {
  const selection = window.getSelection();
  return (
    selection &&
    !selection.isCollapsed &&
    container.contains(selection.focusNode)
  );
}
