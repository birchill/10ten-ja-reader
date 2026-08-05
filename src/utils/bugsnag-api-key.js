// The Bugsnag notifier (SDK) API key.
//
// This key is public by nature: it ships in the extension bundle so the app can
// report errors, and it is trivially readable from the source. Uploading source
// maps uses a separate, secret Uploads API key (BUGSNAG_UPLOAD_API_KEY) so the
// public notifier key cannot be used to replace this project's source maps.
// Reporting builds, however, still requires this notifier key.
export const BUGSNAG_NOTIFIER_API_KEY = 'e707c9ae84265d122b019103641e6462';
