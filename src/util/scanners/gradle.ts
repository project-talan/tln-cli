import { githubReleases } from './builder.js';

export const gradleConfig = githubReleases('gradle/gradle').at('gradle').id('gradle').build();
