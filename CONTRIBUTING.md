# Contributing <!-- omit in toc -->

- [Introduction](#introduction)
- [Ground Rules](#ground-rules)
- [Code Contributions](#code-contributions)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Getting started](#getting-started)
  - [Pull Requests](#pull-requests)
- [Style Guides](#style-guides)
  - [Git Commit Messages](#git-commit-messages)
  - [Coding style](#coding-style)
    - [Style preferences not handled by the linter](#style-preferences-not-handled-by-the-linter)

# Introduction

Thank you for considering contributing! It's people like you that make the open source community so great! 😊

The tips and guidelines below are intended to help both contributors and maintainers respect each other's time and effect change as quickly as possible.

- **Bugs and Feature Requests**: Follow the templates [here](https://github.com/melink14/rikaikun/issues/new/choose) to report problems or ideas. You may be asked for clarification or opinions on solutions.
- **Fixes**: Take a look at the open issues. Even if you are unable to implement a solution, commenting on issues with your opinions and experiences is greatly appreciated and helpful for triage.
- **Documentation**: Update or add a page to the [wiki](https://github.com/melink14/rikaikun/wiki) or improve preexisting documentation to help other users.
- **Something Else?**: This list isn't comprehensive so if you have another idea for contribution, please reach out.

# Ground Rules

**Responsibilities**

- Be welcoming and treat everyone with respect as per the [Code of Conduct](CODE_OF_CONDUCT.md).
- Before doing any major work, [open an issue](https://github.com/melink14/rikaikun/issues/new/choose) to garner community feedback.

# Code Contributions

## Your First Code Contribution

Working on your first pull request? You can learn how from this _free_ series,
[How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

[Here are some good first issues.](https://github.com/melink14/rikaikun/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3A%22good+first+issue%22)

If you get stuck, push your code early and ask for feedback on the issue.

## Getting started

1. After you check out the code, run `npm install` ([npm installation guide](https://www.npmjs.com/get-npm)) to get the rikaikun dev tools ready.
2. Make your changes and commit them locally. Run `npm run fix` often to ensure your code follows style guidelines.
3. Run `npm run build` to create an unpackaged instance of rikaikun in the `dist` directory. Load this into Chrome to test your changes.
4. When you're satisfied with your changes, commit your code, check that your commit message follows [these guidelines](#git-commit-messages), and start a pull request.

## Pull Requests

Pull requests (PR) are where the main discussion around _how_ you implemented your change will happen. The following guidelines will ensure a quick and painless merge.

- Each PR should solve one concern and be of reasonable size. For tips on keeping pull requests small, see the following [blog post](https://unhashable.com/stacked-pull-requests-keeping-github-diffs-small/).
  - Generally, every code change in your PR should be required for your feature or bug fix. If you notice an improvement along the way, please open a new issue for it and submit a new PR. One off improvements are usually OK but mention them explicitly in your commit/PR message.
- The PR title should be a single descriptive phrase of the one thing the PR accomplishes.
- The PR body should give extra details and include links to related issues, pull requests and outside references.
- Usually, your PR should start with one commit which contains your new code. During the course of review, it's better to add commits to your branch instead of amending or rebasing because otherwise Github loses the evolution of the code. When your PR is merged, it will be squashed back into one commit.

# Style Guides

## Git Commit Messages

rikaikun follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) specification. This allows us to automatically generate new versions and change logs and reduces some cognitive load when first reading a commit.

In brief, commit messages should look like:

> feat(dict): Update word and name dictionaries to 2020-08-31 snapshots.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

If your change requires a newer version of Chrome than was required previously, include `BREAKING CHANGE` with an explanation in the footer.

Here are examples of the types currently in use ([source](http://karma-runner.github.io/1.0/dev/git-commit-msg.html)):

```
feat (new feature for the user, not a new feature for build script)
fix (bug fix for the user, not a fix to a build script)
docs (changes to the documentation)
style (formatting, missing semi colons, etc; no production code change)
refactor (refactoring production code, eg. renaming a variable)
test (adding missing tests, refactoring tests; no production code change)
chore (updating grunt tasks etc; no production code change)
```

These are the common scopes used, though feel free to suggest a new one if it makes sense:
| Scope | Explanation |
|-------|------------------------------------------------------------|
| deps | Used when changing the node dependencies of the project. |
| ui | Used for fixes and features affecting the popup UI. |
| dict | Used for fixes and features affecting the dictionary data. |

See the (recent) [commit history](https://github.com/melink14/rikaikun/commits/master) for more examples of correctly formatted messages.

## Coding style

As long as `npm run lint` passes, your code is correctly styled. You may get some more specific advice if a maintainer thinks something is more readable, but it saves a lot of time when we don't have to worry about auto-fixable style issues!

### Style preferences not handled by the linter

- When overriding parent class methods, always include `@override` in your TSDoc string. This gives a strong readability signal without having to read the parent class's code.
