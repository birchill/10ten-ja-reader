import * as core from '@actions/core';
import * as github from '@actions/github';
import * as process from 'node:process';

async function main() {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const {
    repo: { owner, repo },
  } = github.context;

  const rawTarget = core.getInput('target');
  const normalizedTarget = normalizeTarget(rawTarget);
  if (
    normalizedTarget !== 'Firefox' &&
    normalizedTarget !== 'Edge' &&
    normalizedTarget !== 'Chrome'
  ) {
    throw new Error(`Unsupported target: ${rawTarget}`);
  }
  core.info(`Target: ${normalizedTarget}`);

  const releaseId = core.getInput('release_id');
  core.info(`Fetching metadata for release ${releaseId}...`);
  const release = await octokit.rest.repos.getRelease({
    owner,
    repo,
    release_id: releaseId,
  });

  // Find the add-on asset
  let addonAsset;
  const { assets } = release.data;
  for (const asset of assets) {
    if (asset.name.endsWith(`-${normalizedTarget.toLowerCase()}.zip`)) {
      addonAsset = asset;
      break;
    }
  }
  if (!addonAsset) {
    throw new Error(
      `No add-on asset found in ${assets.map((a) => a.name).join(', ')}`
    );
  }
  core.info(`Found add-on asset: ${addonAsset.name}`);
  core.setOutput('addon_asset_name', addonAsset.name);

  // Find the src asset
  if (normalizedTarget === 'Firefox') {
    let srcAsset;
    for (const asset of assets) {
      if (asset.name.endsWith('-src.zip')) {
        srcAsset = asset;
        break;
      }
    }
    if (!srcAsset) {
      throw new Error(
        `No source asset found in ${assets.map((a) => a.name).join(', ')}`
      );
    }
    core.info(`Found source asset: ${srcAsset.name}`);
    core.setOutput('src_asset_name', srcAsset.name);
  }

  // Parse the release notes
  let { body } = release.data;

  // Normalize line breaks
  body = body.replace(/\r?\n/g, '\n');

  const matches = body.match(
    new RegExp(`${normalizedTarget}:\\s*\\n([\\s\\S]*?)(\\n\\n|\\n-->)`)
  );
  if (!matches || matches.length < 2 || !matches[1].length) {
    core.warning(
      'No target section found in release notes. Setting skip = true.'
    );
    core.setOutput('skip', true);
  } else {
    const releaseNotes = matches[1];

    // This regex, which works perfectly fine locally, seems to return too much
    // when running in CI. Is CI doing something to the line-breaks, for
    // example?
    if (releaseNotes.indexOf('Chrome:') !== -1) {
      core.debug('Regex failed');
      core.debug('body: ' + JSON.stringify(body));
      core.debug('matches: ' + JSON.stringify(matches));
      core.debug('releaseNotes: ' + JSON.stringify(releaseNotes));
      core.setFailed('Regex failure');
    } else {
      core.info(`Found release notes for ${rawTarget}`);
      core.info(releaseNotes);
      core.setOutput('release_notes', releaseNotes);
    }
  }
}

main().catch((error) => {
  core.setFailed(error.message);
});

function normalizeTarget(target) {
  const result = target.trim().toLowerCase();
  // Initial caps (since that's what we'll look for in the release notes)
  if (result.length > 2) {
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result.toUpperCase();
}
