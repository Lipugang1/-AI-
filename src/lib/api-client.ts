// API client wrapper that handles auth cookies
export async function authFetch(url: string, options: RequestInit = {}) {
  const defaultOptions: RequestInit = {
    credentials: 'include', // Send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  const response = await fetch(url, mergedOptions);
  
  if (response.status === 401) {
    // Redirect to login
    window.location.href = '/login';
    return response;
  }
  
  return response;
}
