/**
 * Application-wide string constants for consistent messaging.
 */
export const APP_STRINGS = {
  APP_NAME: 'TOSMS',
  APP_TAGLINE: 'Smart Transport Management',

  NO_ROUTE_ASSIGNED: 'No route assigned yet. Please contact admin.',
  NO_DRIVER_ASSIGNED: 'No driver assigned to this route yet.',

  AVAILABILITY_REMINDER: 'Mark your availability for tomorrow by 10 PM',
  AVAILABILITY_MARKED_AVAILABLE: 'Available Tomorrow',
  AVAILABILITY_MARKED_UNAVAILABLE: 'Not Available Tomorrow',
  AVAILABILITY_NOT_MARKED: 'Not marked yet',

  FEE_DUE_MESSAGE: 'Your monthly transport fee is due',
  FEE_PAID_MESSAGE: 'Fee Paid',
  FEE_UNDER_REVIEW: 'Payment Under Review',

  RIDE_WAITING: 'Waiting for driver to start the ride',
  RIDE_ACTIVE: 'Ride in Progress',
  RIDE_COMPLETED: 'You have arrived!',
  NO_RIDES_TODAY: 'No ride scheduled for today',
  NO_UPCOMING_RIDES: 'No upcoming rides scheduled',

  LOGOUT_CONFIRM: 'Are you sure you want to logout?',
  LOGOUT_CONFIRM_MESSAGE: 'You will need to login again to access the app.',
  DELETE_CONFIRM: 'Are you sure?',

  PERMISSION_DENIED: 'Permission denied. Please check your settings.',

  NO_INTERNET: 'No Internet Connection',
  NO_INTERNET_MESSAGE: 'Some features may not work offline.',
  CONNECTION_RESTORED: 'Connection Restored',

  LOADING: 'Loading...',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  RETRY: 'Try Again',
  SAVE: 'Save Changes',
  CANCEL: 'Cancel',
  CONFIRM: 'Confirm',
  SUBMIT: 'Submit',
  BACK: 'Go Back',
} as const;
