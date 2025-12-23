import { User, Presentation, PresentationMeta } from '../types';

// An API service to interact with the backend.
class ApiService {
  private baseUrl = 'http://localhost:8081/api';

  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to check backend health:", error);
      throw error;
    }
  }
  
  // Helper to safely get and deeply clean presentations from localStorage
  private _getAndCleanPresentations(): Presentation[] {
    const presentationsJson = localStorage.getItem('presentations');
    if (!presentationsJson) {
      return [];
    }
    try {
      let allPresentations = JSON.parse(presentationsJson);
      if (!Array.isArray(allPresentations)) {
        return [];
      }
      
      // Deep clean and validate each presentation object to ensure data integrity.
      return allPresentations
        // Filter out any entries that are not objects or are missing an ID.
        .filter(p => p && typeof p === 'object' && p.id)
        // Map over the valid entries to ensure all required fields are present.
        .map((p: any): Presentation => ({
          id: p.id,
          userId: p.userId || 'unknown_user',
          title: p.title || 'Untitled Presentation',
          slides: Array.isArray(p.slides) ? p.slides : [],
          theme: p.theme || 'Default',
          // Provide a default ISO string for createdAt if it's missing or invalid.
          createdAt: p.createdAt || new Date(0).toISOString(),
        }));
    } catch (e) {
      console.error("Failed to parse or clean presentations from localStorage", e);
      return [];
    }
  }

  // Simulates user signup by saving user data to localStorage
  async signup(name: string, email: string, password_raw: string): Promise<User | null> {
    let users: User[] = [];
    try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
    } catch (e) {
        console.error("Failed to parse users from localStorage", e);
        users = [];
    }

    const existingUser = users.find((u: User) => u.email === email);
    if (existingUser) {
      return null; // User already exists
    }
    const newUser: User = { id: Date.now().toString(), name, email };
    
    try {
      // In a real app, password would be hashed.
      localStorage.setItem('users', JSON.stringify([...users, newUser]));
      localStorage.setItem(`user_pass_${email}`, password_raw); // Storing pass for demo purposes
      return newUser;
    } catch (e) {
      console.error("Error saving user data to localStorage:", e);
      return null;
    }
  }

  // Simulates user login by checking credentials in localStorage
  login(email: string, password_raw: string): User | null {
    let users: User[] = [];
    try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
    } catch (e) {
        console.error("Failed to parse users from localStorage", e);
        users = [];
    }

    const user = users.find((u: User) => u.email === email);
    const storedPassword = localStorage.getItem(`user_pass_${email}`);
    if (user && storedPassword === password_raw) {
      try {
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      } catch (e) {
        console.error("Error saving session to localStorage:", e);
        return null; // Login fails if session cannot be saved
      }
    }
    return null;
  }

  // Logs out the current user by removing them from localStorage
  logout(): void {
    try {
      localStorage.removeItem('currentUser');
    } catch (e) {
      console.error("Error removing session from localStorage:", e);
    }
  }

  // Retrieves the currently logged-in user from localStorage
  getCurrentUser(): User | null {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    try {
      // Add basic validation to ensure the parsed object is a valid user
      const user = JSON.parse(userJson);
      if(user && user.id && user.name && user.email) {
        return user;
      }
      return null;
    } catch (e) {
      console.error("Failed to parse currentUser from localStorage", e);
      return null;
    }
  }

  // Gets all presentations for a given user ID
  getPresentations(userId: string): Presentation[] {
    const allPresentations = this._getAndCleanPresentations();
    return allPresentations.filter((p: Presentation) => p.userId === userId);
  }
  
  // Gets presentation metadata for a given user ID for performant listing
  getPresentationsMeta(userId: string): PresentationMeta[] {
    const allPresentations = this._getAndCleanPresentations();
    const userPresentations = allPresentations.filter((p: Presentation) => p.userId === userId);
    
    // Map to metadata to avoid sending heavy slide data to the dashboard
    return userPresentations.map(p => ({
      id: p.id,
      title: p.title,
      slideCount: Array.isArray(p.slides) ? p.slides.length : 0,
      createdAt: p.createdAt,
    }));
  }


  // Gets a single presentation by its ID
  getPresentation(id: string): Presentation | null {
    const allPresentations = this._getAndCleanPresentations();
    return allPresentations.find((p: Presentation) => p.id === id) || null;
  }

  // Saves or updates a presentation in localStorage
  savePresentation(presentation: Presentation): Presentation {
    let allPresentations = this._getAndCleanPresentations();
    const existingIndex = allPresentations.findIndex((p: Presentation) => p.id === presentation.id);
    if (existingIndex > -1) {
      allPresentations[existingIndex] = presentation;
    } else {
      allPresentations.push(presentation);
    }
    try {
      localStorage.setItem('presentations', JSON.stringify(allPresentations));
    } catch (e) {
      console.error("Error saving presentation to localStorage:", e);
      // Fails silently to prevent app crash. User still has current state in memory.
    }
    return presentation;
  }

  // Deletes a presentation by its ID
  deletePresentation(id: string): void {
    let allPresentations = this._getAndCleanPresentations();
    const filteredPresentations = allPresentations.filter((p: Presentation) => p.id !== id);
    try {
      localStorage.setItem('presentations', JSON.stringify(filteredPresentations));
    } catch (e) {
      console.error("Error updating presentations in localStorage after deletion:", e);
    }
  }
}

export const apiService = new ApiService();