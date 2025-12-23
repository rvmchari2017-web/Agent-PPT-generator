
import React, { useState, useCallback, useEffect } from 'react';
import { View, User, Presentation } from './types';
import LoginPage from './components/auth/LoginPage';
import SignUpPage from './components/auth/SignUpPage';
import DashboardPage from './components/dashboard/DashboardPage_old';
import CreatePresentationPage from './components/create/CreatePresentationPage';
import EditorPage from './components/editor/EditorPage';
import { apiService } from './services/apiService';

// Main App component that controls the view of the application
const App: React.FC = () => {
  // State to manage the current user, initialized from mock API service
  const [user, setUser] = useState<User | null>(apiService.getCurrentUser());
  // State to manage the current view, defaults to Dashboard if user is logged in, otherwise Login
  const [currentView, setCurrentView] = useState<View>(user ? View.Dashboard : View.Login);
  // State to hold the ID of the presentation being edited
  const [editingPresentationId, setEditingPresentationId] = useState<string | null>(null);

  // Effect to update the view when the user state changes
  useEffect(() => {
    setCurrentView(user ? View.Dashboard : View.Login);
  }, [user]);

  // Callback to handle successful login
  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(View.Dashboard);
  }, []);

  // Callback to handle logout
  const handleLogout = useCallback(() => {
    apiService.logout();
    setUser(null);
    setCurrentView(View.Login);
  }, []);

  // Callback to navigate to the sign-up page
  const handleNavigateToSignUp = useCallback(() => {
    setCurrentView(View.SignUp);
  }, []);
  
  // Callback to navigate back to the login page
  const handleNavigateToLogin = useCallback(() => {
    setCurrentView(View.Login);
  }, []);

  // Callback to start creating a new presentation
  const handleCreateNew = useCallback(() => {
    setCurrentView(View.Create);
  }, []);

  // Callback to navigate back to the dashboard
  const handleBackToDashboard = useCallback(() => {
    setEditingPresentationId(null);
    setCurrentView(View.Dashboard);
  }, []);

  // Callback to handle starting the editing of a presentation
  const handleEditPresentation = useCallback((id: string) => {
    setEditingPresentationId(id);
    setCurrentView(View.Editor);
  }, []);

  // Callback to handle the successful generation of a presentation
  const handlePresentationGenerated = useCallback((presentation: Presentation) => {
    setEditingPresentationId(presentation.id);
    setCurrentView(View.Editor);
  }, []);
  
  // Renders the component for the current view
  const renderContent = () => {
    switch (currentView) {
      case View.Login:
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />;
      case View.SignUp:
        return <SignUpPage onSignUpSuccess={handleNavigateToLogin} onNavigateToLogin={handleNavigateToLogin} />;
      case View.Dashboard:
        return user ? <DashboardPage user={user} onLogout={handleLogout} onCreateNew={handleCreateNew} onEditPresentation={handleEditPresentation} /> : <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />;
      case View.Create:
        return user ? <CreatePresentationPage user={user} onLogout={handleLogout} onBack={handleBackToDashboard} onPresentationGenerated={handlePresentationGenerated} /> : <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />;
      case View.Editor:
        return user && editingPresentationId ? <EditorPage presentationId={editingPresentationId} onBack={handleBackToDashboard} /> : <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />;
      default:
        return <LoginPage onLogin={handleLogin} onNavigateToSignUp={handleNavigateToSignUp} />;
    }
  };

  return <div className="min-h-screen font-sans">{renderContent()}</div>;
};

export default App;
