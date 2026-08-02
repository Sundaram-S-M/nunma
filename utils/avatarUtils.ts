export const getSafeAvatar = (avatarUrl: string | undefined | null) => {
  if (!avatarUrl) return '/default-avatar.png';
  
  // ALLOW LIST: Only allow known good image hosts
  if (
    avatarUrl.includes('googleusercontent.com') ||
    avatarUrl.includes('firebasestorage.googleapis.com') ||
    avatarUrl.includes('bunnycdn') ||
    avatarUrl.startsWith('/') ||
    avatarUrl.startsWith('./')
  ) {
    return avatarUrl; // Safe
  }
  
  // If it's anything else (dicebear, ui-avatars, multiavatar, base64, arbitrary external URLs, etc.)
  // Force it to the new logo
  return '/default-avatar.png';
};
