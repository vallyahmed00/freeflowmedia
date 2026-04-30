import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

/**
 * AdminRoute - Protects admin routes with Firebase Auth + Firestore role check
 * 
 * How it works:
 * 1. Checks if user is logged in via Firebase Auth
 * 2. Looks up user's role in Firestore (users collection)
 * 3. Only allows access if role === "admin"
 * 4. Redirects to / if not authenticated or not admin
 * 
 * Firestore Structure Required:
 * users/{userId} {
 *   role: "admin" | "user" | "editor"
 *   email: string
 *   createdAt: timestamp
 * }
 */
export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading"); // "loading" | "admin" | "denied"

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("denied");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          // User not found in Firestore
          setStatus("denied");
          return;
        }

        const role = userDoc.data()?.role;
        setStatus(role === "admin" ? "admin" : "denied");
      } catch (error) {
        console.error("Error checking admin status:", error);
        setStatus("denied");
      }
    });

    return () => unsub();
  }, []);

  if (status === "loading") {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'var(--bg-color)' 
      }}>
        <div className="loader-spinner"></div>
      </div>
    );
  }
  
  if (status === "denied") {
    return <Navigate to="/" replace />;
  }
  
  return children;
}
