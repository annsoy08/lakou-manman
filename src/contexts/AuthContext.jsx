"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile } from "@/lib/firestore";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase auth not available, using mock auth");
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            setUserProfile(profile);
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Auth setup failed:", error);
      setLoading(false);
    }
  }, []);

  async function register(email, password, profileData) {
    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: profileData.name });
      await createUserProfile(cred.user.uid, {
        name: profileData.name,
        email,
        photo: "",
        country: profileData.country || "",
        city: profileData.city || "",
        childAges: profileData.childAges || "",
        bio: profileData.bio || "",
        role: "user",
      });
      const profile = await getUserProfile(cred.user.uid);
      setUserProfile(profile);
      return cred.user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  async function login(email, password) {
    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(cred.user.uid);
      setUserProfile(profile);
      return cred.user;
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  }

  async function logout() {
    if (!auth) {
      setUser(null);
      setUserProfile(null);
      return;
    }
    
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }

  async function resetPassword(email) {
    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }

  async function refreshProfile() {
    if (user && auth) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    }
  }

  const isAdmin = userProfile?.role === "admin";

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    register,
    login,
    logout,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
