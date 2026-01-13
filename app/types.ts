/**
 * Type Definitions for BananaFlow
 * 
 * This module contains all TypeScript interfaces and enums used throughout
 * the application for type safety and documentation.
 * 
 * @module types
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of nodes available in the workflow editor.
 */
export enum NodeType {
  /** A node for entering text input */
  TEXT_INPUT = 'TEXT_INPUT',
  /** A node for uploading/displaying images */
  IMAGE_INPUT = 'IMAGE_INPUT',
  /** A node that generates text using AI */
  TEXT_GENERATOR = 'TEXT_GENERATOR',
  /** A node that generates or edits images using AI */
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  /** A node that generates videos (experimental) */
  VIDEO_GENERATOR = 'VIDEO_GENERATOR',
  /** A node that displays the output of the workflow */
  OUTPUT_DISPLAY = 'OUTPUT_DISPLAY',
  /** A node with a pre-configured prompt template */
  PROMPT_PRESET = 'PROMPT_PRESET',
}

/**
 * Possible states of a node during workflow execution.
 */
export enum NodeStatus {
  /** Node is waiting to be processed */
  IDLE = 'IDLE',
  /** Node is currently being processed */
  PROCESSING = 'PROCESSING',
  /** Node has completed processing successfully */
  COMPLETED = 'COMPLETED',
  /** Node encountered an error during processing */
  ERROR = 'ERROR',
}

// ============================================================================
// Node-related Interfaces
// ============================================================================

/**
 * Defines an input connection point on a node.
 */
export interface NodeInput {
  /** Unique identifier for this input handle */
  id: string;
  /** Display label for the input */
  label: string;
  /** The type of data this input accepts */
  type: 'text' | 'image' | 'video' | 'any';
}

/**
 * Defines an output connection point on a node.
 */
export interface NodeOutput {
  /** Unique identifier for this output handle */
  id: string;
  /** Display label for the output */
  label: string;
  /** The type of data this output produces */
  type: 'text' | 'image' | 'video' | 'any';
}

/**
 * Contains the mutable data and state of a node.
 */
export interface NodeData {
  /** Display label for the node */
  label: string;
  /** Array of input connection points */
  inputs: NodeInput[];
  /** Array of output connection points */
  outputs: NodeOutput[];
  /** The current content/value of the node (text, File, base64 image, etc.) */
  content: unknown;
  /** Current processing status */
  status: NodeStatus;
  /** Error message if status is ERROR */
  errorMessage?: string;
  /** Width of the node in pixels */
  width?: number;
  /** Height of the node in pixels */
  height?: number;
  /** Custom prompt for preset nodes */
  prompt?: string;
  /** Whether the node is muted (skipped during execution) */
  isMuted?: boolean;
}

/**
 * Represents a node in the workflow canvas.
 */
export interface Node {
  /** Unique identifier for the node */
  id: string;
  /** The type of node */
  type: NodeType;
  /** Position on the canvas */
  position: { x: number; y: number };
  /** Node data and state */
  data: NodeData;
  /** Z-index for layering (higher = on top) */
  zIndex?: number;
}

// ============================================================================
// Edge Interface
// ============================================================================

/**
 * Represents a connection between two nodes.
 */
export interface Edge {
  /** Unique identifier for the edge */
  id: string;
  /** ID of the source node */
  sourceNodeId: string;
  /** ID of the output handle on the source node */
  sourceHandleId: string;
  /** ID of the target node */
  targetNodeId: string;
  /** ID of the input handle on the target node */
  targetHandleId: string;
}

// ============================================================================
// Utility Interfaces
// ============================================================================

/**
 * A 2D point coordinate.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * An item in the generation history.
 */
export interface HistoryItem {
  /** Unique identifier */
  id: string;
  /** Type of content (currently only 'image' is supported) */
  type: 'image';
  /** The data URL of the generated image */
  dataUrl: string;
  /** The prompt used to generate this image */
  prompt: string;
  /** Unix timestamp when this was generated */
  timestamp: number;
}

/**
 * A group of nodes (for future use).
 */
export interface Group {
  /** Unique identifier */
  id: string;
  /** Display label for the group */
  label: string;
  /** Color of the group border/background */
  color: string;
  /** IDs of nodes in this group */
  nodeIds: string[];
}

// ============================================================================
// Theme & Settings Interfaces
// ============================================================================

/**
 * Theme settings for customizing the appearance of the editor.
 */
export interface Theme {
  /** Background color of the canvas */
  canvasBackground: string;
  /** Background color of nodes (hex) */
  nodeBackground: string;
  /** Opacity of node backgrounds (0-1) */
  nodeOpacity: number;
  /** Text color inside nodes */
  nodeTextColor: string;
  /** Text color for file uploader placeholder */
  uploaderTextColor: string;
  /** Optional background image for the canvas (data URL) */
  canvasBackgroundImage: string | null;
  /** Width of connection lines in pixels */
  edgeWidth: number;
  /** Colors for different types of connections */
  edgeColors: {
    /** Color for text connections */
    text: string;
    /** Color for image connections */
    image: string;
    /** Color for video connections */
    video: string;
    /** Color for any/generic connections */
    any: string;
  };
  /** Primary button color */
  buttonColor: string;
}

/**
 * Keyboard shortcut mappings.
 */
export interface Shortcuts {
  /** Key to run the workflow */
  run: string;
  /** Key to save the workflow */
  save: string;
  /** Key to load a workflow */
  load: string;
  /** Key to copy selected nodes */
  copy: string;
  /** Key to paste nodes */
  paste: string;
  /** Key to delete selected nodes */
  delete: string;
  /** Key to group selected nodes */
  group: string;
  /** Key to ungroup nodes */
  ungroup: string;
  /** Key to mute/unmute nodes */
  mute: string;
}
