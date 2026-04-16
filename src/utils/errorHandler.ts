/**
 * Centralized Firebase error handler that maps error codes to user-friendly messages.
 */
export function handleFirebaseError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact admin';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'permission-denied':
      return 'You do not have permission to perform this action';
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again';
    case 'not-found':
      return 'The requested data was not found';
    case 'cancelled':
      return 'Operation was cancelled. Please try again';
    case 'deadline-exceeded':
      return 'Request timed out. Check your connection';
    case 'resource-exhausted':
      return 'Too many requests. Please wait a moment';
    default:
      return 'Something went wrong. Please try again.';
  }
}
