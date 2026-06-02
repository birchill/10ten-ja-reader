const fs = require('node:fs');
const path = require('node:path');

const ISSUE_REF_RE = /\[.*?\]\(.*?\)|\B#([1-9]\d*)\b/g;

function linkifyIssueRefs(line, options) {
  const repo = options?.repo || getRepoFromPackageJson();
  if (!repo) {
    return line;
  }

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  return line.replace(ISSUE_REF_RE, (match, issue) =>
    issue ? `[#${issue}](${serverUrl}/${repo}/issues/${issue})` : match
  );
}

function getRepoFromPackageJson() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    const repositoryUrl =
      typeof packageJson.repository === 'string'
        ? packageJson.repository
        : packageJson.repository?.url;
    if (!repositoryUrl) {
      return null;
    }

    return (
      repositoryUrl
        .replace(/^git\+/, '')
        .match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1] || null
    );
  } catch {
    return null;
  }
}

function formatSummary(summary, options) {
  const lines = summary.trim().split(/\r?\n/);
  const [firstLine, ...rest] = lines;

  return [
    `- ${linkifyIssueRefs(firstLine.trimEnd(), options)}`,
    ...rest.map((line) => `  ${linkifyIssueRefs(line.trimEnd(), options)}`),
  ].join('\n');
}

async function getReleaseLine(changeset, _type, options) {
  return `\n\n${formatSummary(changeset.summary, options)}`;
}

async function getDependencyReleaseLine() {
  return '';
}

module.exports = { getDependencyReleaseLine, getReleaseLine };
