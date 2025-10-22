import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Navbar = () => {
  const location = useLocation();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const navItems = [
    { path: '/', label: 'Upload' },
    { path: '/judges', label: 'Judges' },
    { path: '/assign', label: 'Assign Judges' },
    { path: '/run', label: 'Run' },
    { path: '/results', label: 'Results' },
  ];

  const resetAllData = async () => {
    setIsResetting(true);
    try {
      // Clear all Firebase collections
      const collections = ['submissions', 'judges', 'evaluations', 'assignments', 'queues'];
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const deletePromises = snapshot.docs.map(docSnapshot => 
          deleteDoc(doc(db, collectionName, docSnapshot.id))
        );
        await Promise.all(deletePromises);
      }
      
      // Reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Failed to reset data. Please try again.');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>AI Judge</h2>
        </div>
        <ul className="navbar-nav">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="navbar-actions">
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Data'}
          </button>
        </div>
      </nav>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset All Data</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to reset all data? This will permanently delete all:
              </p>
              <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
                <li>Submissions</li>
                <li>Judges</li>
                <li>Evaluations</li>
                <li>Assignments</li>
                <li>Queues</li>
              </ul>
              <p style={{ fontWeight: 'bold', color: '#f44336' }}>
                This action cannot be undone!
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={resetAllData}
                disabled={isResetting}
              >
                {isResetting ? 'Resetting...' : 'Reset All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
