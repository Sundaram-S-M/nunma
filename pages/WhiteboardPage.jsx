import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { ArrowLeft, Monitor } from 'lucide-react';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const WhiteboardPage = () => {
  const { zoneId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [zone, setZone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchZone = async () => {
      try {
        const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
        if (zoneDoc.exists()) {
          setZone(zoneDoc.data());
        } else {
          setError('Zone not found');
        }
      } catch (err) {
        console.error('Error fetching zone:', err);
        setError('Failed to load zone details');
      } finally {
        setLoading(false);
      }
    };

    fetchZone();
  }, [zoneId, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="whiteboard-loader">
        <div className="spinner"></div>
        <p>Initializing Whiteboard...</p>
        <style>{`
          .whiteboard-loader {
            height: 100vh; width: 100vw; background: #0a0a0a;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #c2f575; font-family: 'Inter', sans-serif;
          }
          .spinner {
            width: 40px; height: 40px; border: 3px solid rgba(194, 245, 117, 0.1);
            border-top: 3px solid #c2f575; border-radius: 50%;
            animation: spin 1s linear infinite; margin-bottom: 20px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="whiteboard-error">
        <h2>{error}</h2>
        <button onClick={() => navigate(-1)}>Go Back</button>
        <style>{`
          .whiteboard-error {
            height: 100vh; width: 100vw; background: #0a0a0a;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #ff4d4d; font-family: 'Inter', sans-serif;
          }
          button {
            margin-top: 20px; background: #c2f575; color: #0a0a0a; border: none;
            padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700;
          }
        `}</style>
      </div>
    );
  }

  const isThala = user?.uid === zone?.createdBy;

  const handleMount = (editor) => {
    // Requirement Step 2: If !isThala && isMobile, force isReadonly
    if (!isThala && isMobile) {
      editor.updateInstanceState({ isReadonly: true });
    } else if (!isThala) {
      // Keep existing non-creator restriction
      editor.updateInstanceState({ isReadonly: true });
    }
  };

  const handleBack = () => {
    if (isThala) {
      navigate(`/workplace/manage/${zoneId}`);
    } else {
      navigate(`/classroom/zone/${zoneId}`);
    }
  };

  return (
    <div className="whiteboard-container">
      <header className="top-bar">
        <div className="top-bar-left">
          <button className="back-btn" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="top-bar-center">
          <Monitor className="zone-icon" size={20} />
          <h1 className="zone-title">{zone?.title}</h1>
          <span className="label">Whiteboard</span>
        </div>

        <div className="top-bar-right">
          {isThala ? (
            <span className="badge badge-active">Session Active</span>
          ) : (
            <span className="badge badge-view">View Mode</span>
          )}
        </div>
      </header>

      <main className="whiteboard-main">
        <Tldraw 
          persistenceKey={zoneId} 
          onMount={handleMount} 
          hideUi={(!isThala && isMobile) || !isThala}
        />
      </main>

      <style>{`
        .whiteboard-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          color: #fcfcfc;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
          touch-action: none;
          overscroll-behavior: none;
        }

        .top-bar {
          height: 48px;
          min-height: 48px;
          background: rgba(10, 10, 10, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 100;
        }

        .top-bar-left, .top-bar-right {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .top-bar-right {
          justify-content: flex-end;
        }

        .top-bar-center {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #c2f575;
          color: #c2f575;
          transform: translateX(-2px);
        }

        .zone-icon {
          color: #c2f575;
        }

        .zone-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.5;
          padding-left: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          display: inline-block;
        }

        .badge {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .badge-active {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.1);
        }

        .badge-view {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .whiteboard-main {
          flex: 1;
          position: relative;
        }

        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .zone-title, .label {
            display: none;
          }
          .top-bar-center {
            gap: 0;
          }
          .top-bar-left, .top-bar-right {
            flex: initial;
          }
        }

        /* Hide full tldraw UI for non-creators on mobile or generally for non-creators */
        .tl-ui-container {
          display: (!isThala && isMobile) || !isThala ? 'none !important' : 'block';
        }
      `}</style>
    </div>
  );
};

export default WhiteboardPage;
