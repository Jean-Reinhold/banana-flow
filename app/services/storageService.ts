/**
 * Storage Service for BananaFlow
 * 
 * Provides persistent storage for:
 * - Generation History: Stored in IndexedDB (supports large image data)
 * - Workflow State: Stored in localStorage (nodes, edges, theme - no images)
 * - API Key: Stored in localStorage
 * 
 * IndexedDB is used for images because localStorage has a ~5MB limit,
 * while IndexedDB can store hundreds of megabytes.
 * 
 * @module storageService
 */

import type { Node, Edge, Theme, HistoryItem } from '../types';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'BananaFlowDB';
const STORE_NAME = 'history';
const DB_VERSION = 1;

/** Key used for storing workflow state in localStorage */
const WORKFLOW_KEY = 'banana_flow_workflow';

/** Key used for storing API key in localStorage */
const API_KEY_KEY = 'gemini_api_key';

// ============================================================================
// IndexedDB Operations (for History with large image data)
// ============================================================================

/**
 * Opens a connection to the IndexedDB database.
 * Creates the database and object store if they don't exist.
 * 
 * @returns Promise resolving to the database connection
 */
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Saves the entire history array to IndexedDB.
 * This replaces all existing history items.
 * 
 * @param history - Array of history items to save
 */
export const saveHistory = async (history: HistoryItem[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing history in DB to match state
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    // Add all items
    for (const item of history) {
      store.add(item);
    }

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to save history to IndexedDB:', error);
  }
};

/**
 * Loads all history items from IndexedDB.
 * Items are sorted by timestamp in descending order (newest first).
 * 
 * @returns Promise resolving to array of history items
 */
export const loadHistory = async (): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const sorted = (request.result || []).sort(
          (a: HistoryItem, b: HistoryItem) => (b.timestamp || 0) - (a.timestamp || 0)
        );
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load history from IndexedDB:', error);
    return [];
  }
};

/**
 * Adds a single item to the history in IndexedDB.
 * 
 * @param item - The history item to add
 */
export const addItemToHistory = async (item: HistoryItem): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(item);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to add item to IndexedDB:', error);
  }
};

/**
 * Deletes a single item from the history by ID.
 * 
 * @param id - The ID of the history item to delete
 */
export const deleteItemFromHistory = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to delete item from IndexedDB:', error);
  }
};

/**
 * Clears all history items from IndexedDB.
 */
export const clearHistory = async (): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
  }
};

// ============================================================================
// localStorage Operations (for Workflow State - no large images)
// ============================================================================

/**
 * Workflow state interface for storage.
 * Note: Node content that contains File objects or large base64 images
 * is stripped before saving to avoid localStorage quota issues.
 */
export interface StoredWorkflow {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  theme: Theme;
  savedAt: number;
}

/**
 * Strips large content (Files, base64 images) from nodes before saving.
 * This prevents localStorage quota errors while preserving node structure.
 * 
 * @param nodes - Record of nodes to process
 * @returns Nodes with large content replaced by null
 */
const stripLargeContent = (nodes: Record<string, Node>): Record<string, Node> => {
  const stripped: Record<string, Node> = {};
  
  for (const [id, node] of Object.entries(nodes)) {
    const content = node.data.content;
    
    // Check if content is a File or a large base64 string
    const isFile = content instanceof File;
    const isLargeBase64 = typeof content === 'string' && 
      content.startsWith('data:') && 
      content.length > 10000; // ~7.5KB threshold
    
    stripped[id] = {
      ...node,
      data: {
        ...node.data,
        // Keep text content, strip files and large images
        content: (isFile || isLargeBase64) ? null : content,
      },
    };
  }
  
  return stripped;
};

/**
 * Saves the current workflow state to localStorage.
 * Large content (images, files) is stripped to avoid quota errors.
 * 
 * @param nodes - Current nodes state
 * @param edges - Current edges state  
 * @param theme - Current theme settings
 */
export const saveWorkflow = (
  nodes: Record<string, Node>,
  edges: Record<string, Edge>,
  theme: Theme
): void => {
  try {
    const workflow: StoredWorkflow = {
      nodes: stripLargeContent(nodes),
      edges,
      theme,
      savedAt: Date.now(),
    };
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify(workflow));
  } catch (error) {
    console.error('Failed to save workflow to localStorage:', error);
  }
};

/**
 * Loads the workflow state from localStorage.
 * 
 * @returns The stored workflow or null if none exists
 */
export const loadWorkflow = (): StoredWorkflow | null => {
  try {
    const data = localStorage.getItem(WORKFLOW_KEY);
    if (!data) return null;
    return JSON.parse(data) as StoredWorkflow;
  } catch (error) {
    console.error('Failed to load workflow from localStorage:', error);
    return null;
  }
};

/**
 * Clears the saved workflow from localStorage.
 */
export const clearWorkflow = (): void => {
  try {
    localStorage.removeItem(WORKFLOW_KEY);
  } catch (error) {
    console.error('Failed to clear workflow from localStorage:', error);
  }
};

// ============================================================================
// API Key Storage
// ============================================================================

/**
 * Saves the API key to localStorage.
 * 
 * @param apiKey - The Gemini API key to save
 */
export const saveApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem(API_KEY_KEY, apiKey);
  } catch (error) {
    console.error('Failed to save API key:', error);
  }
};

/**
 * Loads the API key from localStorage.
 * 
 * @returns The stored API key or empty string if none exists
 */
export const loadApiKey = (): string => {
  try {
    return localStorage.getItem(API_KEY_KEY) || '';
  } catch (error) {
    console.error('Failed to load API key:', error);
    return '';
  }
};
