import React, { useState, useEffect, useCallback } from 'react';
import { User, PresentationMeta } from '../../types';
import { apiService } from '../../services/apiService';
import { LogoIcon, LogoutIcon, PlusIcon, EmptyIcon, CloseIcon } from '../common/icons';

// Props for the DashboardPage component
interface DashboardPageProps {
  user: User;
  onLogout: () => void;
  onCreateNew: () => void;
  onEditPresentation: (id: string) => void;
}

// Component for the user dashboard/gallery page
const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout, onCreateNew, onEditPresentation }) => {
  // State to hold the list of user's presentations metadata for performance
  const [presentations, setPresentations] = useState<PresentationMeta[]>([]);

  // Effect to fetch presentation metadata when the component mounts
  useEffect(() => {
    const userPresentations = apiService.getPresentationsMeta(user.id);
    setPresentations(userPresentations);
  }, [user.id]);

  // Handler to delete a presentation
  const handleDelete = useCallback((id: string) => {
    // Show a confirmation dialog to prevent accidental deletion
    if (window.confirm('Are you sure you want to delete this presentation? This action cannot be undone.')) {
      apiService.deletePresentation(id);
      // Update the local state to remove the presentation from the view immediately
      setPresentations(prev => prev.filter(p => p.id !== id));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header section */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <LogoIcon className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-800">SlideForge AI</span>
              <span className="text-gray-500 hidden sm:block">Welcome, {user.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <PlusIcon className="w-5 h-5"/>
                New Presentation
              </button>
              <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <LogoutIcon className="w-5 h-5"/>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Presentations</h1>
          <p className="text-gray-500 mt-1">Manage and edit your presentations</p>
        </div>
        
        {/* Conditional rendering based on whether presentations exist */}
        {presentations.length === 0 ? (
          <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-12 mt-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600">
              <EmptyIcon className="w-8 h-8"/>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900">No presentations yet</h2>
            <p className="mt-2 text-gray-500">Create your first AI-powered presentation</p>
            <button
              onClick={onCreateNew}
              className="mt-6 flex mx-auto items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
               <PlusIcon className="w-5 h-5"/>
              Create Presentation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Map through presentations and display them as cards */}
            {presentations.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-md overflow-hidden group relative">
                <div onClick={() => onEditPresentation(p.id)} className="cursor-pointer">
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                      <img src={`https://picsum.photos/seed/${p.id}/400/200`} alt="Presentation thumbnail" className="w-full h-full object-cover"/>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-indigo-600">{p.title}</h3>
                    <p className="text-sm text-gray-500">{p.slideCount} slides</p>
                    <p className="text-xs text-gray-400 mt-2">Created on {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents the card's onEdit handler from firing
                    handleDelete(p.id);
                  }}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 focus:opacity-100 transition-all duration-200"
                  title="Delete Presentation"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;