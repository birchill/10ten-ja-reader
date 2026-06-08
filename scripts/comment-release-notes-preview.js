import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'node:fs';
import * as process from 'node:process';

const MARKER = '<!-- 10ten-release-notes-preview -->';

async function main() {
  const prNumber = Number(process.env.RELEASE_PR_NUMBER);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(
      `Invalid RELEASE_PR_NUMBER: ${process.env.RELEASE_PR_NUMBER}`
    );
  }

  const previewPath = process.env.RELEASE_NOTES_PREVIEW_PATH;
  if (!previewPath) {
    throw new Error('RELEASE_NOTES_PREVIEW_PATH is required');
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const preview = fs.readFileSync(previewPath, 'utf8').trimEnd();
  const body = `${MARKER}\n${preview}`;
  const octokit = github.getOctokit(token);
  const {
    repo: { owner, repo },
  } = github.context;

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  const existingComment = comments.find((comment) =>
    comment.body?.startsWith(MARKER)
  );

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body,
    });
    core.info(`Updated release notes preview comment ${existingComment.id}.`);
  } else {
    const { data: comment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
    core.info(`Created release notes preview comment ${comment.id}.`);
  }
}

main().catch((error) => {
  core.setFailed(error.message);
});
