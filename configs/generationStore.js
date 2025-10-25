// Simple in-memory store for generation status
const generationStore = new Map();

export const setGenerationStatus = (
  courseId,
  status,
  data = null,
  error = null
) => {
  generationStore.set(courseId, {
    status,
    data,
    error,
    timestamp: Date.now(),
  });

  console.log(`Generation status updated for ${courseId}: ${status}`);
};

export const getGenerationStatus = (courseId) => {
  return generationStore.get(courseId) || { status: "not_found" };
};

export const clearGenerationStatus = (courseId) => {
  generationStore.delete(courseId);
  console.log(`Generation status cleared for ${courseId}`);
};

// Optional: Clean up old entries (older than 1 hour)
export const cleanupOldEntries = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [courseId, entry] of generationStore.entries()) {
    if (entry.timestamp < oneHourAgo) {
      generationStore.delete(courseId);
      console.log(`Cleaned up old entry for ${courseId}`);
    }
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupOldEntries, 30 * 60 * 1000);
