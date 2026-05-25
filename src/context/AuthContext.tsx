import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import { User } from "@types";

interface AuthContextType {
  currentUser: User | null;
  // Session restoration state for navigator selection only.
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: "student" | "driver",
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const USER_STORAGE_KEY = "tosms_user";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // RootNavigator uses this while Firebase restores the authenticated session.
  const [isLoading, setIsLoading] = useState(true);
  const isRegistering = useRef(false);
  const userDocUnsubscribeRef = useRef<(() => void) | null>(null);

  // Persistence: Save to AsyncStorage
  const saveUserToStorage = useCallback(async (user: User | null) => {
    try {
      if (user) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error saving user to storage:", error);
    }
  }, []);

  // Persistence: Load from AsyncStorage
  const loadUserFromStorage = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
    }
  }, []);

  useEffect(() => {
    // Initial load from storage for faster startup
    loadUserFromStorage();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (isRegistering.current) {
          return; // Ignore auth state changes during registration to avoid flashing the dashboard
        }

        if (userDocUnsubscribeRef.current) {
          userDocUnsubscribeRef.current();
          userDocUnsubscribeRef.current = null;
        }

        setIsLoading(true);
        if (firebaseUser) {
          userDocUnsubscribeRef.current = onSnapshot(
            doc(db, COLLECTIONS.USERS, firebaseUser.uid),
            async (userDoc) => {
              if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                setCurrentUser(userData);
                await saveUserToStorage(userData);
              } else {
                console.warn(
                  `User document not found for UID: ${firebaseUser.uid}`,
                );
                setCurrentUser(null);
                await saveUserToStorage(null);
              }
              setIsLoading(false);
            },
            (error: any) => {
              if (
                error.code === "failed-precondition" ||
                error.message?.includes("offline")
              ) {
                console.warn(
                  "Firestore is offline, using cached data if available.",
                );
              }
              console.error("Error fetching user document:", error);
              setCurrentUser(null);
              setIsLoading(false);
            },
          );
        } else {
          setCurrentUser(null);
          await saveUserToStorage(null);
          setIsLoading(false);
        }
      },
    );

    return () => {
      if (userDocUnsubscribeRef.current) {
        userDocUnsubscribeRef.current();
        userDocUnsubscribeRef.current = null;
      }
      unsubscribe();
    };
  }, [loadUserFromStorage, saveUserToStorage]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: "student" | "driver",
  ) => {
    isRegistering.current = true;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { uid } = userCredential.user;

      const newUser: any = {
        uid,
        fullName,
        email,
        phone,
        role,
        profileImageUrl: null,
        fcmToken: null,
        expoPushToken: null,
        createdAt: serverTimestamp(),
      };

      if (role === "driver") {
        newUser.approved = false;
        newUser.status = "pending";
        newUser.profileComplete = false;
        newUser.rating = 0;
        newUser.totalRides = 0;
        newUser.routeId = "";
        newUser.vehicleType = "";
        newUser.vehiclePlate = "";
        newUser.vehicleCapacity = 0;
        newUser.cnic = "";
      } else {
        newUser.status = "active";
        newUser.routeId = "";
        newUser.pickupStop = "";
      }

      await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
      // Ensure user is signed out so they have to login manually
      await signOut(auth);
      // We do NOT set current user or save to storage here
    } catch (error) {
      throw error;
    } finally {
      // Re-enable auth state listening after a short delay
      // to ensure the automatic sign-in event from Firebase is entirely ignored
      setTimeout(() => {
        isRegistering.current = false;
      }, 1000);
    }
  };

  const logout = async () => {
    try {
      // Set currentUser to null first - this triggers isAuthenticated to become false
      // and React to unmount authenticated screens synchronously
      setCurrentUser(null);
      await saveUserToStorage(null);

      // Small delay to allow React to finish unmounting processes
      // and useEffect cleanups to fire (unsubscribing Firestore listeners)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Then sign out from Firebase
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const updateUser = (data: Partial<User>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      saveUserToStorage(updated);
      return updated;
    });
  };

  const value: AuthContextType = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
