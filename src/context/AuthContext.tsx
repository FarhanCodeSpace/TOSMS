import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "@config/firebase";
import { COLLECTIONS } from "@config/firebaseCollections";
import { User } from "@types";

interface AuthContextType {
  currentUser: User | null;
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
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch full user doc from Firestore
  const fetchUserDoc = useCallback(
    async (uid: string) => {
      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser(userData);
          await saveUserToStorage(userData);
        } else {
          console.warn(`User document not found for UID: ${uid}`);
          // If no doc exists, we should probably sign out or handle as incomplete profile
          // Setting to null for now ensures we don't get stuck in a partial state
          setCurrentUser(null);
          await saveUserToStorage(null);
        }
      } catch (error: any) {
        if (error.code === 'failed-precondition' || error.message?.includes('offline')) {
          console.warn("Firestore is offline, using cached data if available.");
          // In offline mode, Firestore getDoc might still work if persistence is on
          // but we'll log it specifically for the user
        }
        console.error("Error fetching user document:", error);
        throw error; // Rethrow to allow caller to handle
      }
    },
    [saveUserToStorage],
  );

  useEffect(() => {
    // Initial load from storage for faster startup
    loadUserFromStorage();

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        setIsLoading(true);
        if (firebaseUser) {
          try {
            await fetchUserDoc(firebaseUser.uid);
          } catch (error) {
            console.error("Auth state change error:", error);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          await saveUserToStorage(null);
        }
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [loadUserFromStorage, fetchUserDoc, saveUserToStorage]);

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
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const { uid } = userCredential.user;

      const newUser: User = {
        uid,
        fullName,
        email,
        phone,
        role,
        profileImageUrl: null,
        fcmToken: null,
        expoPushToken: null,
        createdAt: serverTimestamp() as any, // Cast for simplicity in this initial state
        status: "active",
        ...(role === "driver"
          ? {
              approved: false,
              totalRides: 0,
              rating: 0,
              profileComplete: false,
            }
          : {}),
      };

      await setDoc(doc(db, COLLECTIONS.USERS, uid), newUser);
      setCurrentUser(newUser);
      await saveUserToStorage(newUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      await saveUserToStorage(null);
    } catch (error) {
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
