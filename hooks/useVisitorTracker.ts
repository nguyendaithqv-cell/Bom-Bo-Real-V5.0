import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrors';

// Module-level variable to prevent duplicate tracking across unmounts/remounts in StrictMode
let globalLastTrackedUrl = '';

export const useVisitorTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const currentUrl = location.pathname + location.search;
    
    // Prevent duplicate tracking for the exact same URL in a short time
    if (globalLastTrackedUrl === currentUrl) {
      return;
    }
    globalLastTrackedUrl = currentUrl;

    const visitorId = localStorage.getItem('visitorId') || crypto.randomUUID();
    localStorage.setItem('visitorId', visitorId);

    // Extract plotId from URL if present (e.g., /plot/E09)
    let plotId: string | undefined;
    const match = location.pathname.match(/^\/plot\/([a-zA-Z0-9]+)$/i);
    if (match && match[1]) {
      plotId = match[1].toUpperCase();
    }

    const trackVisitor = async () => {
      const visitorRef = doc(db, 'visitor_logs', visitorId);
      try {
        const visitorSnap = await getDoc(visitorRef);

        const pageHistoryEntry = {
          pageUrl: currentUrl,
          timestamp: new Date().toISOString(),
        };

        if (visitorSnap.exists()) {
          await updateDoc(visitorRef, {
            lastVisited: serverTimestamp(),
            pageHistory: arrayUnion(pageHistoryEntry),
            ...(plotId ? { viewedPlots: arrayUnion(plotId) } : {})
          });
        } else {
          await setDoc(visitorRef, {
            visitorId,
            lastVisited: serverTimestamp(),
            source: document.referrer,
            device: navigator.userAgent,
            viewedPlots: plotId ? [plotId] : [],
            pageHistory: [pageHistoryEntry]
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `visitor_logs/${visitorId}`);
      }
    };

    trackVisitor();
  }, [location.pathname, location.search]);
};

export const updateVisitorInfo = async (visitorId: string, name?: string, phone?: string) => {
  const visitorRef = doc(db, 'visitor_logs', visitorId);
  const visitorSnap = await getDoc(visitorRef);
  
  if (visitorSnap.exists()) {
    const data = visitorSnap.data();
    const updates: any = {};
    
    if (name && name.trim()) {
      const trimmedName = name.trim();
      const currentNames = data.name ? String(data.name).split(',').map(n => n.trim()) : [];
      if (!currentNames.includes(trimmedName)) {
        updates.name = data.name ? `${data.name}, ${trimmedName}` : trimmedName;
      }
    }
    
    if (phone && phone.trim()) {
      const trimmedPhone = phone.trim();
      const currentPhones = data.phoneNumber ? String(data.phoneNumber).split(',').map(p => p.trim()) : [];
      if (!currentPhones.includes(trimmedPhone)) {
        updates.phoneNumber = data.phoneNumber ? `${data.phoneNumber}, ${trimmedPhone}` : trimmedPhone;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(visitorRef, updates);
    }
  }
};

export const trackVisitorOffer = async (visitorId: string, plotId: string, offeredPrice: string, originalPrice: number) => {
  const visitorRef = doc(db, 'visitor_logs', visitorId);
  const visitorSnap = await getDoc(visitorRef);
  
  if (visitorSnap.exists()) {
    await updateDoc(visitorRef, {
      offers: arrayUnion({
        plotId,
        offeredPrice,
        originalPrice,
        timestamp: new Date().toISOString()
      })
    });
  }
};

export const trackVisitorConsignment = async (visitorId: string, consignmentData: any) => {
  const visitorRef = doc(db, 'visitor_logs', visitorId);
  const visitorSnap = await getDoc(visitorRef);
  
  if (visitorSnap.exists()) {
    await updateDoc(visitorRef, {
      status: 'resale',
      lastConsignment: {
        ...consignmentData,
        timestamp: new Date().toISOString()
      }
    });
  }
};
