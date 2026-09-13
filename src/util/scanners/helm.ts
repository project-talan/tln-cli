import { githubReleases } from './builder.js';

export const helmConfig = githubReleases('helm/helm').at('helm').id('helm').build();
