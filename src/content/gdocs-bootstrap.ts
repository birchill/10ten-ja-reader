// If we're on Firefox but we're not running in the main world (because Firefox
// doesn't support that yet due to
// https://bugzilla.mozilla.org/show_bug.cgi?id=1736575)
// then we can still access the main world's window object by unwrapping it.
if ((window as any).wrappedJSObject) {
  (window as any).wrappedJSObject._docs_annotate_canvas_by_ext =
    'pnmaklegiibbioifkmfkgpfnmdehdfan';
} else {
  (window as any)._docs_annotate_canvas_by_ext =
    'pnmaklegiibbioifkmfkgpfnmdehdfan';
}
