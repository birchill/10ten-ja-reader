import type { ChangelogFunctions } from '@changesets/types';

const MARKDOWN_LINK_OR_ISSUE_REF_REGEX = /\[.*?\]\(.*?\)|\B#([1-9]\d*)\b/g;

type ChangelogOptions = { repo?: unknown; serverUrl?: unknown };

const changelog: ChangelogFunctions = {
  async getReleaseLine(changeset, _type, options) {
    // No leading newline, matching the default `@changesets/changelog-git`
    // formatter: apply-release-plan joins release lines with a single `\n`, so
    // returning just the summary keeps notes as a contiguous bullet list within
    // a section. Blank lines that remain between change-type sections are
    // removed afterwards by `scripts/postprocess-changeset-changelog.js`.
    return formatSummary(changeset.summary, options);
  },

  async getDependencyReleaseLine() {
    return '';
  },
};

function linkifyIssueRefs(
  line: string,
  options: null | Record<string, unknown>
): string {
  const repo = getRepoOption(options);
  if (!repo) {
    return line;
  }

  const serverUrl = getServerUrlOption(options) || 'https://github.com';
  return line.replace(MARKDOWN_LINK_OR_ISSUE_REF_REGEX, (match, issue) =>
    issue ? `[#${issue}](${serverUrl}/${repo}/issues/${issue})` : match
  );
}

function getRepoOption(options: null | Record<string, unknown>): string | null {
  const { repo } = (options || {}) as ChangelogOptions;
  return typeof repo === 'string' ? repo : null;
}

function getServerUrlOption(
  options: null | Record<string, unknown>
): string | null {
  const { serverUrl } = (options || {}) as ChangelogOptions;
  return typeof serverUrl === 'string' ? serverUrl : null;
}

function formatSummary(
  summary: string,
  options: null | Record<string, unknown>
): string {
  const lines = summary.trim().split(/\r?\n/);
  const [firstLine, ...rest] = lines;

  return [
    `- ${linkifyIssueRefs(firstLine.trimEnd(), options)}`,
    ...rest.map((line) => `  ${linkifyIssueRefs(line.trimEnd(), options)}`),
  ].join('\n');
}

export default changelog;
