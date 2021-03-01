const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

async function main() {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const {
    repo: { owner, repo },
    sha,
  } = github.context;
  const prerelease = core.getInput('prerelease').toLowerCase() === 'true';
  const version = core.getInput('version').toLowerCase();

  const release = await octokit.repos.createRelease({
    owner,
    repo,
    tag_name: `v${version}`,
    name: `Release v${version}`,
    draft: true,
    prerelease,
    target_commitish: sha,
  });

  const root = path.join(__dirname, '..', '..', '..');

  // Upload Firefox asset
  const firefoxPackageName = core.getInput('firefox_package_name');
  const firefoxPackagePath = path.join(
    root,
    'dist-firefox-package',
    firefoxPackageName
  );
  await octokit.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `rikaichamp-${version}-firefox.zip`,
    data: fs.readFileSync(firefoxPackagePath),
  });

  // Upload Chrome asset
  const chromePackageName = core.getInput('chrome_package_name');
  const chromePackagePath = path.join(
    root,
    'dist-firefox-package',
    chromePackageName
  );
  await octokit.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `rikaichamp-${version}-chrome.zip`,
    data: fs.readFileSync(chromePackagePath),
  });

  // Upload source asset
  const sourcePackagePath = path.join(
    root,
    'dist-src',
    `rikaichamp-${version}-src.zip`
  );
  await octokit.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: release.data.id,
    name: `rikaichamp-${version}-src.zip`,
    data: fs.readFileSync(sourcePackagePath),
  });

  // Upload raw source files
  for (const file of fs.readdirSync(path.join(root, 'dist-firefox'))) {
    // Too lazy to import @actions/glob...
    if (!file.startsWith('rikaichamp-') || !file.endsWith('.js')) {
      continue;
    }

    await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.data.id,
      name: file,
      data: fs.readFileSync(path.join(root, 'dist-firefox', file)),
    });
  }

  core.setOutput('url', release.data.html_url);
}

main().catch((error) => {
  core.setFailed(error.message);
});
