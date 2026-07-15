import { TerminalNode } from './terminal-node'

/**
 * React Flow compares this map by reference, so it lives outside the component
 * module and is created exactly once.
 */
export const terminalNodeTypes = { terminal: TerminalNode }
