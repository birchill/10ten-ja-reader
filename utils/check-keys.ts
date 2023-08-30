import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as process from 'node:process';
import * as url from 'node:url';
import yargs from 'yargs/yargs';

async function main() {
  const args = await yargs(process.argv.slice(2))
    .option('locale', {
      alias: 'l',
      type: 'string',
      description:
        "Locale to check for missing strings. If specified, this should match one of the directory names under _locales. Defaults to all locales other than 'en'",
    })
    .option('copy', {
      alias: 'c',
      type: 'boolean',
      default: false,
      description:
        'Flag to indicate missing strings should be appended to the file along with the English translation. Defaults to false.',
    })
    .option('prefix', {
      alias: 'p',
      type: 'string',
      description:
        'A prefix to add to any copied strings (to indicate they have yet to be translated)',
    }).argv;

  const enData = readEnData();
  let totalMissingKeys = 0;

  if (args.locale && args.locale !== '*') {
    if (args.locale === 'en') {
      throw new Error(
        "Can't check the keys for en locale since it is the primary source"
      );
    }

    totalMissingKeys = await checkLocale({
      ...args,
      locale: args.locale,
      enData,
    });
  } else {
    const localeDir = url.fileURLToPath(
      new URL('../_locales', import.meta.url)
    );
    const localeFiles = fg.sync('**/messages.json', {
      cwd: localeDir,
      absolute: true,
    });

    // We should have at least one locale other than en
    if (localeFiles.length < 2) {
      throw new Error('Failed to find any locale files');
    }

    for (const file of localeFiles) {
      const matches = file.match(/\/([^/]+?)\/messages.json/);
      if (!matches || matches.length < 2) {
        throw new Error(`Failed to determine the locale from path ${file}`);
      }
      const locale = matches[1];
      if (locale === 'en') {
        continue;
      }

      totalMissingKeys += await checkLocale({ ...args, locale, enData });
    }
  }

  // Return a non-zero exit code if there were missing keys
  if (totalMissingKeys) {
    // Print grand total if we scanned multiple files
    if (!args.locale || args.locale === '*') {
      console.log(`Got a total of ${totalMissingKeys} missing key(s).`);
    }
    process.exit(2);
  }
}

interface L18NData {
  [key: string]: any;
}

function readEnData(): L18NData {
  const messageFile = url.fileURLToPath(
    new URL('../_locales/en/messages.json', import.meta.url)
  );

  const data = fs.readFileSync(messageFile, { encoding: 'utf8' });
  return JSON.parse(data) as L18NData;
}

async function checkLocale({
  locale,
  copy,
  prefix,
  enData,
}: {
  locale: string;
  copy: boolean;
  prefix?: string;
  enData: L18NData;
}) {
  console.log(`Checking keys for '${locale}' locale...`);

  const messageFile = url.fileURLToPath(
    new URL(`../_locales/${locale}/messages.json`, import.meta.url)
  );
  if (!fs.existsSync(messageFile)) {
    throw new Error(`Could not find message file: ${messageFile}`);
  }

  const data = fs.readFileSync(messageFile, { encoding: 'utf8' });
  const parsedData = JSON.parse(data) as L18NData;

  // Look for missing keys
  const missingKeys = new Set(Object.keys(enData));
  for (const key of Object.keys(parsedData)) {
    missingKeys.delete(key);
  }

  // Report results
  for (const key of missingKeys) {
    console.log(`  '${key}' is missing`);
  }

  if (missingKeys.size) {
    console.log(`${missingKeys.size} missing key(s) in '${locale}' locale.`);
  }

  // Copy, if requested
  if (missingKeys.size && copy) {
    console.log(
      `Copying missing keys${prefix ? ` (prefix: '${prefix}')` : ''}...`
    );
    for (const key of missingKeys) {
      if (prefix) {
        // This awkward arrangement should hopefully mean the message is
        // serialized first.
        const updatedMessage = enData[key];
        updatedMessage.message = `${prefix}${enData[key].message}`;
        parsedData[key] = updatedMessage;
      } else {
        parsedData[key] = enData[key];
      }
    }
    fs.writeFileSync(messageFile, JSON.stringify(parsedData, null, 2), {
      encoding: 'utf8',
    });
  }

  return missingKeys.size;
}

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((e) => {
    console.error('Unhandled error');
    console.error(e);
    process.exit(1);
  });
