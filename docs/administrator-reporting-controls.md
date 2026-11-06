# Administrator controls for diagnostic reports

10ten can save error reports locally and, with user consent, send them to help
diagnose extension problems. Organizations can use these policies to restrict
that behavior for managed installations.

These controls concern optional diagnostic reports. They do not disable
dictionary downloads, exchange-rate downloads, pronunciation audio requests, or
the ordinary server access logs associated with those requests.

Set these optional boolean policies through your browser's managed storage:

| Key                        | Effect when `true`                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DisableErrorReporting`    | Blocks automatic reports and manual submissions to Bugsnag and `https://data.10ten.life/report`. Local saving and inspection remain available.                                               |
| `DisableLocalErrorStorage` | Deletes saved diagnostic reports, prevents new persistent saves, and suppresses the saved-report notice. Immediate sending remains possible with user consent. Failed sends cannot be saved. |

Set both to `true` to prevent both sending and saving. Missing or `false` values
impose no restriction and never grant consent. Removing a policy restores the
effect of the user's existing choice; it does not change Firefox permissions.
Requests already dispatched cannot be recalled.

## Firefox and Thunderbird on desktop

On Windows, create a `distribution` folder beside `firefox.exe` or
`thunderbird.exe`, then save the following as `distribution/policies.json`:

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "{59812185-ea92-4cca-8ab7-cfcacee81281}": {
          "DisableErrorReporting": true,
          "DisableLocalErrorStorage": true
        }
      }
    }
  }
}
```

For centrally managed Firefox on Windows, you can instead deploy the
[`3rdparty` enterprise policy](https://firefox-admin-docs.mozilla.org/reference/policies/3rdparty/).
Create a `REG_SZ` value named `{59812185-ea92-4cca-8ab7-cfcacee81281}` under
`HKLM\Software\Policies\Mozilla\Firefox\3rdparty\Extensions`, with this JSON string as its data:

```json
{ "DisableErrorReporting": true, "DisableLocalErrorStorage": true }
```

Use a JSON string so Firefox receives booleans rather than registry DWORD
numbers. See the linked policy reference for deployment details and other
platforms, and [Thunderbird enterprise policies](https://thunderbird.github.io/policy-templates/)
for Thunderbird deployment options.

Restart Firefox/Thunderbird after changing policy. Firefox loads managed storage
at startup, and Thunderbird does not support managed-storage change events.

## Chrome and Edge

Use the installed extension's ID from `chrome://extensions` or
`edge://extensions`. The extension includes `managed-storage-schema.json`.

On Windows, create DWORD values using the policy names above (`1` for true,
`0` for false) under
`HKLM\Software\Policies\Google\Chrome\3rdparty\extensions\YOUR_EXTENSION_ID\policy`
or
`HKLM\Software\Policies\Microsoft\Edge\3rdparty\extensions\YOUR_EXTENSION_ID\policy`.

On Linux, the managed policy file can contain:

```json
{
  "3rdparty": {
    "extensions": {
      "YOUR_EXTENSION_ID": {
        "policy": {
          "DisableErrorReporting": true,
          "DisableLocalErrorStorage": true
        }
      }
    }
  }
}
```

Place the file under `/etc/opt/chrome/policies/managed/` for Google Chrome or
`/etc/opt/edge/policies/managed/` for Microsoft Edge.

Chrome/Edge notify the extension when refreshed managed policy changes.

See [Chrome extension policies](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions/enterprise-policies)
and [Edge extension policies](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-ref-guide).

## Availability and failures

Safari and Firefox for Android do not provide these managed-storage controls.
On supported browsers, reporting and new persistent saves are blocked while a
policy read is pending or fails. An unconfigured Firefox/Thunderbird managed
storage manifest is treated as no policy. A read failure alone does not delete
existing saved reports.

See [Mozilla's managed-storage documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/managed),
[Thunderbird enterprise policies](https://thunderbird.github.io/policy-templates/),
and [Thunderbird's storage API](https://webextension-api.thunderbird.net/en/beta-mv2/storage.html).
