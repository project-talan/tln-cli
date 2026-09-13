import { githubReleases } from './builder.js';

export const gruntConfig = githubReleases('gruntjs/grunt').at('grunt').id('grunt').build();
