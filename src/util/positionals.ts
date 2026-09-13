import type { PositionalOptions } from 'yargs';

/**
 * Shared `components` positional definition, reused by every command that accepts
 * a colon-delimited components target (config/inspect/ls/exec/run).
 */
export const componentsPositional = {
  describe: 'Delimited by colon components, i.e. maven:boost:bootstrap',
  default: '',
  type: 'string',
} satisfies PositionalOptions;
