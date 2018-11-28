/* eslint-disable no-warning-comments */
/* globals atom */
'use babel';

import {promisify} from 'util'; // eslint-disable-line node/no-unsupported-features/node-builtins, max-len
import {dirname} from 'path';
import {exec as execOriginal} from 'child_process';

import {Directory} from 'atom'; // eslint-disable-line import/no-unresolved, node/no-missing-import, max-len
import gitURLParse from 'git-url-parse';
import request from 'request-promise-native';

const debug = true;
const exec = promisify(execOriginal);

const hostToProviderShortNameMap = new Map([
  // Todo: Map supported non-Github Git providers
  ['github.com', 'g']
]);

/**
 *
 * @param {Array} args
 * @returns {undefined}
 */
function log (...args) {
  if (!debug) {
    return;
  }
  console.log(...args); // eslint-disable-line no-console
}
/**
 *
 * @param {Array} args
 * @returns {undefined}
 */
function warn (...args) {
  if (!debug) {
    return;
  }
  console.warn(...args); // eslint-disable-line no-console
}

/**
 *
 * @returns {undefined}
 */
export function activate () { // Optional
  if (!debug) {
    return;
  }
  console.log('activating LGTM linter...'); // eslint-disable-line no-console
}

/**
 *
 * @returns {undefined}
 */
export function deactivate () { // Optional
}

/**
 *
 * @returns {Object}
 */
export function provideLinter () {
  return {
    name: 'linter-lgtm',
    scope: 'file', // or 'project'
    lintsOnChange: false, // Only set to `true` if linting between saves
    grammarScopes: ['source.js'], // Todo: Could support other languages
    async lint (textEditor) {
    // const text = textEditor.getText();
      const editorPath = textEditor.getPath();
      const cwd = dirname(editorPath);
      const cwdDirInstance = new Directory(cwd);
      const repo = await atom.project.repositoryForDirectory(cwdDirInstance);
      if (!repo) { // Todo: Support non-Git repos
        warn('No repo found for', editorPath);
        return [];
      }
      const repoOrigin = repo.getOriginURL();
      if (!repoOrigin) { // Does LGTM offer any local services?
        warn('No remote origin found for repo of', editorPath);
        return [];
      }
      const repoURL = gitURLParse(repoOrigin);
      if (!repoURL || !hostToProviderShortNameMap.has(repoURL.source)) {
        warn('No provider found for origin', repoOrigin, editorPath);
        return [];
      }
      const provider = hostToProviderShortNameMap.get(repoURL.source);

      let {name, owner: org} = repoURL;
      if (!org || !name) {
        warn(
          `no org or name found for provider ${provider}`,
          repoOrigin,
          editorPath
        );
        return [];
      }

      const opts = {
        cwd,
        maxBuffer: 2 * 1000 * 1024,
        windowsHide: true
      };

      // Todo: The token should not actually be stored in config like
      //  this as it may be shared when users share their configs;
      //  Atom unfortunately doesn't have a hidden type, so would
      //  need to save in the home directory or something and find
      //  another way to get the user to enter their token as opposed
      //  to having a textbox available within settings as it is now.
      // 1. Get token
      const token = atom.config.get('linter-lgtm.token');

      // 2. Determine `external-id` (e.g., PR number)
      // We just make up our own
      const externalID = 1; // new Date().getTime();

      // 3. Get last commit SHA
      let commitID;
      try {
        const {stdout} = await exec('git rev-parse HEAD', opts); // , stderr
        commitID = stdout && stdout.trim();
        if (!commitID) {
          warn('No last commit found', repoOrigin, editorPath);
          return [];
        }
      } catch (err) {
        warn('Error with `git rev-parse HEAD`', err, repoOrigin, editorPath);
        return [];
      }

      // 4. Get diff since last commit
      let diff;
      try {
        const {stdout} = await exec('git diff --binary', opts); // , stderr
        diff = stdout && stdout.trim();
        if (!diff) {
          warn('No diff for ', editorPath, repoOrigin);
          return [];
        }
      } catch (err) {
        warn('Error with `git diff --binary`', repoOrigin, editorPath, err);
        return [];
      }

      log('token', token);
      log('externalID', externalID);
      log('commitID', commitID);
      log('diff', diff);
      log('org', org);
      log('name', name);

      // Find fork parent for Github since LGTM apparently only
      //   tracks the originals
      if (provider === 'g') {
        const getForkInfoURL = `https://api.github.com/repos/${org}/${name}`;
        log('getForkInfoURL', getForkInfoURL);
        const {source: forkInfo} = await request({
          url: getForkInfoURL,
          json: true,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'node.js'
          }
        });
        if (forkInfo) {
          ({name, owner: {login: org}} = forkInfo);
          if (!org || !name) {
            warn(
              `no org or name found for fork with owner ${repoURL.owner} and ' +
                'name ${repoURL.name} provider ${provider}`,
              repoOrigin,
              editorPath
            );
            return [];
          }
          log('fork org', org);
          log('fork name', name);
        }
      }

      // 5. Get project ID:
      let projectID;
      const getProviderURL = `https://lgtm.com/api/v1.0/projects/${provider}/${org}/${name}`;
      log('getProviderURL', getProviderURL);
      try {
        const providerInfoResp = await request({
          url: getProviderURL,
          json: true,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        log('providerInfoResp', providerInfoResp);
        ({id: projectID} = providerInfoResp);
      } catch (err) {
        warn(err);
      }
      if (!projectID) {
        warn('No ID found', getProviderURL, repoOrigin, editorPath);
        return [];
      }
      log('projectID', projectID);

      const postDiffURL = `https://lgtm.com/api/v1.0/codereviews/${projectID}?base=${commitID}&external-id=${externalID}`;
      log('postDiffURL', postDiffURL);
      const diffResp = await request({
        url: postDiffURL,
        method: 'POST',
        json: true,
        body: diff,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        }
      });
      log('diffResp', diffResp);

      return [{
        severity: 'info', // error|warning
        location: {
          file: editorPath,
          position: [[0, 0], [0, 1]]
        },
        excerpt: `A random value is ${Math.random()}; token: ${token} test`,
        description: `### What is this?\nThis is a randomly generated value`

        /*
        solutions?: Array<{
        title?: string,
        position: Range,
        priority?: number,
        currentText?: string,
        replaceWith: string,
        } | {
        title?: string,
        position: Range,
        priority?: number,
        apply: (() => any),
        }>,
        reference: {
        elsewhere in file, e.g., class def.
        file: absolute path, position: Point
        }
        url: explanation URL
        icon: octicon for gutter
        linterName: override default name
        */
      }];
    }
  };
}
