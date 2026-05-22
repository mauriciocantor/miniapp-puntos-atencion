const defaultRules = [
  'build', // changes that affect the build system or external dependencies
  'chore', // changes that do not relate to a fix or feature and don't modify src or test files (for example updating dependencies)
  'ci', // continuous integration related
  'docs', // updates to documentation such as a the README or other markdown files
  'feat', // a new feature is introduced with the changes
  'fix', // a bug fix has occurred
  'perf', // performance improvements
  'refactor', // refactored code that neither fixes a bug nor adds a feature
  'revert', // reverts a previous commit
  'style', // changes that do not affect the meaning of the code, likely related to code formatting such as white-space, missing semi-colons, and so on.
  'test' // including new or correcting previous tests
]

const customRules = [
  'conflict', // a merge conflict resolved,
  'wip' // save work in progress
]

module.exports = {
  extends: ['@commitlint/config-conventional'],
  // for custom rules in type 2: type of commit
  rules: {
    'type-enum': [
      2, 'always',
      [
        ...defaultRules,
        ...customRules
      ]
    ]
  }
}
