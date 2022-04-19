import github from '@actions/github';
import core from '@actions/core';

const getPackageJson = async (ref, octokit) =>
{
  const packageJSONData = (await octokit.rest.repos.getContent({
    ...github.context.repo,
    path: process.env['INPUT_PATH'] || 'package.json',
    ref,
  })).data.content;
  if (!packageJSONData)
  {
    throw new Error(`Could not find package.json for commit ${ref}`);
  }
  return JSON.parse(Buffer.from(packageJSONData, 'base64').toString());
};

const run = async () =>
{
  const token = process.env.GITHUB_TOKEN;
  if (!token)
  {
    throw new Error('GITHUB_TOKEN not provided');
  }

  const octokit = new github.getOctokit(token);
  const currentRef = github.context.sha;
  console.log('current ref', currentRef);
  const previousRef = ((await octokit.rest.repos.getCommit({
    ...github.context.repo,
    ref: currentRef,
  })).data.parents[0] || {}).sha;
  console.log('previous ref', previousRef);

  const currentPackageJSON = await getPackageJson(currentRef, octokit);
  console.log('current package', currentPackageJSON);
  core.setOutput('current-package-version', currentPackageJSON.version);

  if (!previousRef)
  {
    core.setOutput('has-updated', true);
    return;
  }

  const previousPackageJSON = await getPackageJson(previousRef, octokit);
  core.setOutput('has-updated', currentPackageJSON.version !== previousPackageJSON.version);
};

run().catch(error =>
{
  core.setFailed(error.message);
});
