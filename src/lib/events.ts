// Custom event for data updates
export const DATA_UPDATED_EVENT = 'appDataUpdated';

// Function to dispatch data updated event
export function dispatchDataUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT));
  }
}

// Function to subscribe to data updates
export function subscribeToDataUpdates(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener(DATA_UPDATED_EVENT, callback);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, callback);
  }
  return () => {};
}
