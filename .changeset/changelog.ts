import type { ChangelogFunctions } from '@changesets/types';

const MARKDOWN_LINK_OR_ISSUE_REF_REGEX = /\[.*?\]\(.*?\)|\B#([1-9]\d*)\b/g;

type ChangelogOptions = { repo?: unknown; serverUrl?: unknown };

const changelog: ChangelogFunctions = {
  async getReleaseLine(changeset, _type, options) {
    return `\n\n${formatSummary(changeset.summary, options)}`;
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
