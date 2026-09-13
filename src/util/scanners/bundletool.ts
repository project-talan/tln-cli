import { githubReleases } from './builder.js';

// Flat at root, not nested under `android/` like old/update.js — see the catalog-shape rule:
// nest only for genuine sub-tool relationships, not by vendor.
export const bundletoolConfig = githubReleases('google/bundletool').at('bundletool').id('bundletool').build();
