const core = require('@actions/core');
const github = require('@actions/github');

const FormData = require('form-data');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const path = require('path');
const { pipeline } = require('stream/promises');

async function main() {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const {
    repo: { owner, repo },
  } = github.context;

  const releaseId = core.getInput('release_id');
  console.log(`Fetching metadata for release ${releaseId}`);
  const release = await octokit.rest.repos.getRelease({
    owner,
    repo,
    release_id: releaseId,
  });

  // Go through the release assets and find the add-on asset
  const addonAssetName = core.getInput('addon_asset_name');
  const addonAsset = release.assets.find((a) => a.name === addonAssetName);
  if (!addonAsset) {
    throw new Error(`No asset found with name ${addonAssetName}`);
  }
  console.log(`Found add-on asset: ${addonAsset.name}`);

  // Fetch the asset
  const assetPath = path.join(process.env.GITHUB_WORKSPACE, 'addon.zip');
  console.log(`Downloading ${addonAsset.browser_download_url} to ${assetPath}`);
  await pipeline(
    await getHttpsStream(addonAsset.browser_download_url),
    fs.createWriteStream(assetPath)
  );

  // Upload the asset
  const form = new FormData();
  form.append('upload', fs.createReadStream(assetPath));
  form.append('channel', 'listed');
  const uploadResponse = uploadToAmoPath('/api/v5/addons/upload/', form);
  const { uuid, version, valid: initiallyValid } = JSON.parse(uploadResponse);
  console.log(
    `Successfully uploaded add-on for version ${version} with uuid ${uuid}`
  );

  // Query the upload details API until it is valid
  //
  // Make sure we set a timeout of 5 minutes, however.
  setTimeout(() => {
    core.setFailed('Timed out waiting for upload to be valid');
    process.exit(1);
  }, 5 * 60 * 1000);

  let valid = initiallyValid;
  while (!valid) {
    // Recommended polling interval is 5~10 seconds according to:
    // https://blog.mozilla.org/addons/2022/03/17/new-api-for-submitting-and-updating-add-ons/
    console.log('Waiting before checking if upload is valid');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('Checking upload status...');
    const { valid, validation } = JSON.parse(
      await getAmoPath(`/api/v5/addons/${uuid}`)
    );
    if (valid) {
      console.log('Upload is valid');
    } else if (valid === false && validation) {
      throw new Error(validation);
    }
    console.log('Upload is still not valid');
  }

  // Create a new version with the provided release notes
  const addonId = core.getInput('addon_id');
  const releaseNotes = core.getInput('release_notes') || release.body;
  const postData = JSON.stringify({
    compatibility: ['android', 'firefox'],
    release_notes: releaseNotes,
    upload: uuid,
  });
  const { id: versionId, version: versionString } = JSON.parse(
    await postToAmoPath(`/api/v5/addons/addon/${addonId}/versions/`, postData)
  );
  console.log(
    `Successfully created version ${versionString} (id: ${versionId})`
  );

  // Get the source asset (if any)
  const srcAssetName = core.getInput('src_asset_name');
  if (srcAssetName) {
    const srcAsset = release.assets.find((a) => a.name === srcAssetName);
    if (!srcAsset) {
      throw new Error(`No asset found with name ${srcAssetName}`);
    }
    console.log(`Found source asset: ${srcAsset.name}`);

    // Download the source asset
    const srcAssetPath = path.join(
      process.env.GITHUB_WORKSPACE,
      'addon-src.zip'
    );
    console.log(
      `Downloading ${srcAsset.browser_download_url} to ${srcAssetPath}`
    );
    await pipeline(
      await getHttpsStream(srcAsset.browser_download_url),
      fs.createWriteStream(srcAssetPath)
    );

    // Upload the source asset
    const form = new FormData();
    form.append('source', fs.createReadStream(srcAssetPath));
    uploadToAmoPath(
      `/api/v5/addons/addon/${addonId}/versions/${versionId}/`,
      form,
      'PATCH'
    );
    console.log('Successfully uploaded source asset');
  }

  console.log('Publishing complete.');
}

main().catch((error) => {
  core.setFailed(error.message);
});

function getHttpsStream(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Got status ${res.statusCode} for ${url}`));
        } else {
          resolve(stream);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function getAmoPath(path) {
  return new Promise((resolve, reject) => {
    https
      .get(
        { hostname: 'addons.mozilla.org', path },
        { auth: `JWT ${getJwtToken()}` },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Got status ${res.statusCode} for ${url}`));
          } else {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => {
              resolve(body);
            });
          }
        }
      )
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function postToAmoPath(path, postData) {
  const options = {
    hostname: 'addons.mozilla.org',
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
    auth: `JWT ${getJwtToken()}`,
  };
  const url = `https://${options.hostname}${options.path}`;

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Got status ${res.statusCode} for ${url}`));
      }

      let response = '';
      res.on('data', (chunk) => {
        response += chunk;
      });
      res.on('end', () => {
        resolve(response);
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function uploadToAmoPath(path, formData, method = 'POST') {
  return new Promise((resolve, reject) => {
    formData.submit(
      {
        host: 'addons.mozilla.org',
        method,
        path,
        protocol: 'https:',
        auth: `JWT ${getJwtToken()}`,
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Got status ${res.statusCode} for ${url}`));
        } else {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve(body);
          });
        }
      }
    );
  });
}

function getJwtToken() {
  const jwtIss = core.getInput('amo_jwt_iss');
  const jwtSecret = core.getInput('amo_jwt_secret');
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iss: jwtIss,
    jti: Math.random().toString(),
    iat: issuedAt,
    exp: issuedAt + 60,
  };
  return jwt.sign(payload, jwtSecret, {
    algorithm: 'HS256', // HMAC-SHA256 signing algorithm
  });
}
