---
'10ten-ja-reader': minor
---

Automatic error reporting now requires consent, using Firefox's native
data-collection permission where supported and a default-off setting elsewhere.

Up to 10 diagnostic reports are saved locally when reporting is off or delivery
fails. Repeated reports share one saved copy with an occurrence count.
Saved reports can be sent once without enabling automatic reporting, with
explicit retries limited to the reports selected in that batch.

Administrators can disable diagnostic sending and local report storage
independently through managed policy. Reports use a dedicated installation ID
and mask lookup text in known error messages and pronunciation-audio URLs.

The options page has a new Error reporting section for turning automatic
reporting on or off and for reviewing, sending, or deleting saved reports,
along with a dismissible notice when unsent reports are waiting.
