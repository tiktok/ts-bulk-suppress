# ts-bulk-suppress

The `ts-bulk-suppress` tool helps you adopt stricter TypeScript compiler settings by providing a way to "suppress" (hide) errors in preexisting files.  In other words, you can require engineers to follow the latest rules in newly written code, without forcing them to go back and fix every old file. In a large codebase, fixing old files can be impractical. That shouldn't block adoption of practices for new code!

This tool can be used together with [@rushstack/eslint-patch](https://www.npmjs.com/package/@rushstack/eslint-patch#eslint-bulk-suppressions-feature), which implements bulk suppressions for ESLint configurations.  Their design and workflows are similar.

## Basic idea

Suppose you have a source file like this:

**my-project/src/index.ts**
```ts
export function getSquared(length): number {
  return length * length;
}
```

The compiler does not provide the best validation for this function, because the type of `a` is not checked; it is treated as the `any` type.  With newer versions of TypeScript, you can enable [noImplicitAny](https://www.typescriptlang.org/tsconfig/noImplicitAny.html) in your **tsconfig.json** file.  This way, the compiler insists on declaring `length: number`:

```
my-project/src/index.ts:179:28 - error TS7006: Parameter 'length' implicitly has an 'any' type.
```

In a large codebase, with this change you are likely to suddenly see thousands of errors `TS7006` across thousands of source files.  How to deal with that?  The idea is to introduce a suppressions file **bulk.config.json** that will list all of the preexisting errors, so that `ts-bulk-suppress` knows to filter them out when it invokes the compiler.  This file is added to Git as part of your project. 

What goes in that file?  We could make a list of file paths such as **my-project/src/index.ts** and ignore any `TS7006` errors for those files, however it turns out that this is not strict enough.  In each of those file paths, engineers would be free to write as much new code as they like, introducing lots more problems over time.  It would be much better to suppress specific line numbers (line `:179` in our example), however this proves too brittle:  Any future change that adds or removes lines could shift the line numbers, breaking our suppression.  And even if engineers try to fix **bulk.config.json**, they will constantly create Git merge conflicts with other engineers working on the same file.

Instead `ts-bulk-suppress` and `@rushstack/eslint-patch` introduce a `scopeId` identifier, which is basically the name of the function and any containing scopes.  In our above example, the `scopeId` would be `.getSquared`.  This allows suppressions to be constrained to specific sections of code in a specific file, such that adding/removing unrelated lines will not break the `scopeId`.  See below for technical details.

## Getting started

Here's how to use `ts-bulk-suppress` with your existing project:

1. It's recommended to install the tool by running `pnpm install ts-bulk-suppress --dev`.  (Instead of `pnpm`, you can substitute `npm` or `yarn` according to your package manager preference.)

2. As an example, let's assume that we just enabled `noImplicitAny` and are now facing thousands of errors.  Run this command to automatically generate the **bulk.config.json** file:

   ```shell
   # Create a bulk.config.json file with suppressions for all compiler errors
   ts-bulk-suppress --gen-bulk-suppress
   ```

3. Make sure the file is tracked by Git:
  
   ```shell
   git add bulk.config.json
   git commit -m "Enabling bulk suppressions"
   ```

4. At this point, if you run the `tsc` command (the official TypeScript compiler), you will still see thousands of errors.  But if you instead run `ts-bulk-suppress`, the suppressed errors will be hidden.

5. You can also add manual configurations to **bulk.config.json**.  For example, suppose that `my-project/src/legacy-sdk` contains hundreds of files that we never intend to fix.  Rather than tracking thousands of individual suppressions, you could add a manual rule like this:

   **my-project/bulk.config.json**
   ```js
     . . .
     "patternSuppressors": [
        {
          // Ignore codes TS7006 for all files under that directory:
          "pathRegExp": "/src/legacy-sdk/.*",
          "codes": [7006]
        }
     ]
     . . .
   ```

## Ignoring external errors

Legacy projects that are in particularly bad shape sometimes encounter these types of errors, which we will call **external errors**:

- **Errors in someone else's .d.ts file**:  The error is reported in a file path somewhere under the `node_modules` folder.
- **Errors without a file path**:  The TypeScript compiler reports a global issue that is not associated with any particular file path.

Although it's not ideal, suppressing these sorts of errors is sometimes necessary to get a legacy project on the road to improvement:

```shell
ts-bulk-suppress --ignore-external-error
```

## Ignoring collateral errors in CI

Suppose the source file **b.ts** depends on **a.ts**.  If you make changes to the file **a.ts**, and **a.ts** has no type errors itself, your changes can still introduce type errors in **b.ts**.  In a legacy project, some engineers may feel that this is unfair.  As a mitigation, a Continuous Integration script (for example, a GitHub Action) can invoke `tsc-bulk-suppress` with the `--changed` option:

```shell
ts-bulk-suppress --changed
```

This will only check the files that were directly modified in the current pull request branch. As a result, it will not detect the errors in **b.ts** that arose due to the dependency changes.  

Obviously this practice can leave your `main` branch in a broken state, but it is sometimes useful when first onboarding a legacy project.


## Command Line Interface (CLI)

It supports the following CLI options:

```log
Usage: tsc-bulk-suppress [options] [files...]

Arguments:
  files                    Target files

Options:
  -v, --verbose            Display verbose log
  --config <path>          Path to suppressConfig
  --stat [path]            Display suppress stat
  --strict-scope           Error scopeId would be as deep as possible
  --changed                Only check changed files compared with target_branch
  --create-default         Create a bulk.config.json file
  --gen-bulk-suppress      Patch bulk-suppressor for current project
  --ignore-config-error    Ignore config-related errors
  --ignore-external-error  Ignore external errors
  -h, --help               display help for command
```

## More about the scopeId

Our `scopeId` design is based on the approach from [@rushstack/eslint-bulk](https://github.com/microsoft/rushstack/tree/main/eslint/eslint-bulk), but with a few minor differences:

1. We use `ts-morph` instead of `estree` to parse the Abstract Syntax Tree (AST), so the hierarchy may be slightly different.

2. The standard `scopeId` can match multiple TypeScript code blocks. For more fine-grained matching, you can set `"strictScope": true` in **bulk.config.json**, which will produce a much longer `scopeId` for more accurate matching.

## bulk.config.json example

Below is a more detailed example for the **bulk.config.json** file format:

 **my-project/bulk.config.json**
```js
{
  "project": "./tsconfig.json", //path to tsconfig.json
  "patternSuppressors": [
    {
      // Ignore codes `7006, 7017` in `/src/js/general` directory
      "pathRegExp": "/src/js/general",
      "codes": [7006, 7017]
    },
    {
      // Ignore codes `2322, 2339, 2341, 2445, 2531, 2540` in *.spec.* files located in `/packages/foo/src/engine/`
      "pathRegExp": "/packages/foo/src/engine/.*\\.spec\\..*",
      "codes": [2322, 2339, 2341, 2445, 2531, 2540]
    },
    {
      // Ignore all errors in /src/gen/
      "pathRegExp": "/src/gen/*.ts",
      "suppressAll": true
    },
  ],
  "bulkSuppressors": [
    //Ignore code 2345 for a error in src/components/MyForm/formConfig.tsx with a scopeId: .filterRoleRegions.isAdmin.b.Region
    {
      "filename": "src/components/MyForm/formConfig.tsx",
      "scopeId": ".filterRoleRegions.isAdmin.b.Region",
      "code": 2345
    },
    {
      "filename": "src/components/MyForm/formConfig.tsx",
      "scopeId": ".getManageResourceRole.filter.TeamId.v.TeamId",
      "code": 2339
    },
    {
      "filename": "src/components/MyForm/formConfig.tsx",
      "scopeId": ".getManageResourceRole.filter.Roles.filter.v.Roles",
      "code": 2339
    }
  ],
  "strictScope": false,
  "ignoreConfigError": false,
  "ignoreExternalError": false
}
```

## What's new

The change log can be found here: [CHANGELOG.md](https://github.com/tiktok/ts-bulk-suppress/blob/main/CHANGELOG.md)
