import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

async function main() {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const {
    repo: { owner, repo },
    sha,
  } = github.context;
  const prerelease = core.getInput('prerelease').toLowerCase() === 'true';
  const releaseNotes = core.getInput('release_notes') || '';
  const version = core.getInput('version').toLowerCase();

  const release = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: `v${version}`,
    name: `Release v${version}`,
    body: releaseNotes,
    draft: true,
    prerelease,
    target_commitish: sha,
  });

  // Upload Firefox asset
  const firefoxPackageName = core.getInput('firefox_package_name');
  const firefoxPackagePath = path.join(
    github.context.workspace,
    'dist-firefox-package',
    firefoxPackageName
  );
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `10ten-ja-reader-${version}-firefox.zip`,
    data: fs.readFileSync(firefoxPackagePath),
  });

  // Upload Chrome asset
  const chromePackageName = core.getInput('chrome_package_name');
  const chromePackagePath = path.join(
    github.context.workspace,
    'dist-chrome-package',
    chromePackageName
  );
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `10ten-ja-reader-${version}-chrome.zip`,
    data: fs.readFileSync(chromePackagePath),
  });

  // Upload Edge asset
  const edgePackageName = core.getInput('edge_package_name');
  const edgePackagePath = path.join(
    github.context.workspace,
    'dist-edge-package',
    edgePackageName
  );
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `10ten-ja-reader-${version}-edge.zip`,
    data: fs.readFileSync(edgePackagePath),
  });

  // Upload Thunderbird asset
  const thunderbirdPackageName = core.getInput('thunderbird_package_name');
  const thunderbirdPackagePath = path.join(
    github.context.workspace,
    'dist-thunderbird-package',
    thunderbirdPackageName
  );
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `10ten-ja-reader-${version}-thunderbird.zip`,
    data: fs.readFileSync(thunderbirdPackagePath),
  });

  // Upload source asset
  const sourcePackagePath = path.join(
    github.context.workspace,
    'dist-src',
    `10ten-ja-reader-${version}-src.zip`
  );
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `10ten-ja-reader-${version}-src.zip`,
    data: fs.readFileSync(sourcePackagePath),
  });

  // Upload raw source files
  for (const file of fs.readdirSync(
    path.join(github.context.workspace, 'dist-firefox')
  )) {
    // Too lazy to import @actions/glob...
    if (!file.startsWith('10ten-ja-') || !file.endsWith('.js')) {
      continue;
    }

    await octokit.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.data.id,
      name: file,
      data: fs.readFileSync(
        path.join(github.context.workspace, 'dist-firefox', file)
      ),
    });
  }

  core.setOutput('url', release.data.html_url);
}

main().catch((error) => {
  core.setFailed(error.message);
});
