/**
 * HTTP Error Helper
 * Extracts user-friendly error messages from API responses
 */

/**
 * Parses error response and returns a user-friendly message
 * Priority:
 * 1. err.response?.data?.message (axios style)
 * 2. err.data?.message (parsed JSON)
 * 3. err.message (if it's a clean message)
 * 4. Status-based fallback messages
 * 5. Generic fallback
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return "Bir hata oluştu";
  }

  // If it's a string, return it (but filter out status codes)
  if (typeof error === "string") {
    return cleanErrorMessage(error);
  }

  // If it's an Error object
  if (error instanceof Error) {
    return cleanErrorMessage(error.message);
  }

  // If it's an object with message property
  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;

    // Check for nested response data (axios style)
    if (err.response && typeof err.response === "object") {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === "object") {
        const data = response.data as Record<string, unknown>;
        if (typeof data.message === "string") {
          return data.message;
        }
        if (typeof data.error === "string") {
          return data.error;
        }
      }
    }

    // Check for direct data property
    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;
      if (typeof data.message === "string") {
        return data.message;
      }
      if (typeof data.error === "string") {
        return data.error;
      }
    }

    // Check for direct message property
    if (typeof err.message === "string") {
      return cleanErrorMessage(err.message);
    }

    // Check for error property
    if (typeof err.error === "string") {
      return err.error;
    }
  }

  return "Bir hata oluştu";
}

/**
 * Cleans error message by removing status codes and parsing JSON
 */
function cleanErrorMessage(message: string): string {
  // Try to parse if it looks like "STATUS: JSON"
  const statusJsonMatch = message.match(/^\d{3}:\s*(.+)$/);
  if (statusJsonMatch) {
    const jsonPart = statusJsonMatch[1].trim();
    try {
      const parsed = JSON.parse(jsonPart);
      if (parsed.message) {
        return parsed.message;
      }
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // Not valid JSON, continue
    }
    // If we couldn't parse JSON, return the part after status code
    return jsonPart;
  }

  // Check if entire message is JSON
  if (message.startsWith("{")) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.message) {
        return parsed.message;
      }
      if (parsed.error) {
        return parsed.error;
      }
    } catch {
      // Not valid JSON
    }
  }

  // Return as-is if it's a clean message
  return message;
}

/**
 * Returns user-friendly message based on HTTP status code
 */
export function getStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "Geçersiz istek";
    case 401:
      return "Oturum süresi dolmuş, lütfen tekrar giriş yapın";
    case 403:
      return "Bu işlem için yetkiniz yok";
    case 404:
      return "İstenen kaynak bulunamadı";
    case 408:
      return "Bağlantı zaman aşımına uğradı";
    case 409:
      return "Bu kayıt zaten mevcut";
    case 422:
      return "Girilen bilgiler geçersiz";
    case 429:
      return "Çok fazla istek gönderildi, lütfen bekleyin";
    case 500:
      return "Sunucu hatası, lütfen daha sonra tekrar deneyin";
    case 502:
    case 503:
    case 504:
      return "Sunucu şu anda kullanılamıyor, lütfen daha sonra tekrar deneyin";
    default:
      if (status >= 500) {
        return "Sunucu hatası oluştu";
      }
      return "Bir hata oluştu";
  }
}

/**
 * Checks if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return true;
  }
  if (error instanceof Error && error.message.includes("NetworkError")) {
    return true;
  }
  return false;
}

/**
 * Gets appropriate error message for network errors
 */
export function getNetworkErrorMessage(): string {
  return "İnternet bağlantınızı kontrol edin";
}
