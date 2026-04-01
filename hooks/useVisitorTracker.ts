import { useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export const useVisitorTracker = (plotId?: string) => {
  useEffect(() => {
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const visitorId = localStorage.getItem('visitorId') || generateUUID();
    localStorage.setItem('visitorId', visitorId);

    const trackVisitor = async () => {
      const visitorRef = doc(db, 'visitor_logs', visitorId);
      const visitorSnap = await getDoc(visitorRef);

      const pageHistoryEntry = {
        pageUrl: window.location.pathname,
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
    };

    trackVisitor();
  }, [plotId]);
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
