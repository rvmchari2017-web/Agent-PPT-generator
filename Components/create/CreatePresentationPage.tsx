import React, { useState } from 'react';
import { User, Presentation, Slide, TextStyle, Background } from '../../types';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { LogoIcon, LogoutIcon, ArrowLeftIcon } from '../common/icons';

// Props for the CreatePresentationPage component
interface CreatePresentationPageProps {
  user: User;
  onLogout: () => void;
  onBack: () => void;
  onPresentationGenerated: (presentation: Presentation) => void;
}

type ContentSource = 'ai' | 'text' | 'file';
type ImageSource = 'ai' | 'google' | 'none';

// Default text styles for new slides
const defaultTitleStyle: TextStyle = { fontSize: '48px', fontFamily: 'Arial', color: '#000000', bold: true, italic: false, underline: false };
const defaultContentStyle: TextStyle = { fontSize: '24px', fontFamily: 'Arial', color: '#333333', bold: false, italic: false, underline: false };

// Component for the presentation creation page
const CreatePresentationPage: React.FC<CreatePresentationPageProps> = ({ user, onLogout, onBack, onPresentationGenerated }) => {
  // State for form inputs and generation status
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<ContentSource>('ai');
  const [textContent, setTextContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [numSlides, setNumSlides] = useState(7);
  const [selectedTheme, setSelectedTheme] = useState('Default');
  const [imageSource, setImageSource] = useState<ImageSource>('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handles the presentation generation process
  const handleGenerate = async () => {
    if (!title.trim() && source === 'ai') {
      setError('Presentation Title is required for AI generation.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      let contentForGeneration: string;
      let presentationTitle = title.trim();

      // Determine content source for AI processing
      switch(source) {
        case 'text':
          if (!textContent.trim()) {
            setError('Please provide content in the text area.');
            setIsLoading(false);
            return;
          }
          contentForGeneration = textContent;
          if (!presentationTitle) presentationTitle = textContent.substring(0, 50) + '...';
          break;
        case 'file':
          if (!uploadedFile) {
            setError('Please upload a file.');
            setIsLoading(false);
            return;
          }
          if (!presentationTitle) presentationTitle = uploadedFile.name.replace(/\.[^/.]+$/, "");
          contentForGeneration = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target?.result as string);
              reader.onerror = e => reject(new Error("Failed to read file."));
              if (uploadedFile.type === 'text/plain') {
                  reader.readAsText(uploadedFile);
              } else {
                  // Mock reading for other file types for this demo
                  console.warn('File type not directly readable, using file name as content.');
                  resolve(`This presentation is about the contents of the file named: ${uploadedFile.name}`);
              }
          });
          break;
        case 'ai':
        default:
          contentForGeneration = title;
          break;
      }

      // Generate slide content using Gemini service based on source
      const slideContents = source === 'ai'
        ? await geminiService.generatePresentationSlides(contentForGeneration, numSlides)
        : await geminiService.generateSlidesFromText(contentForGeneration, numSlides);
      
      // Map generated content to Slide objects
      const slides: Slide[] = await Promise.all(
        slideContents.map(async (content, index) => {
          const slideId = `${Date.now()}-${index}`;
          // FIX: Changed background to a `let` so it can be reassigned.
          let background: Background = { type: 'color', value: '#FFFFFF' };
          
          if(imageSource !== 'none') {
              const imagePrompt = content.title || presentationTitle;
              let imageUrl = '';
              if (imageSource === 'ai') {
                  imageUrl = await geminiService.generateImage(imagePrompt);
              } else { // 'google'
                  const unsplashAccessKey = "qVlLIbWM3_zujJt49iWEr8dLaqrr-JXzWfJqGkPRMkI";
                  const sanitizedQuery = imagePrompt.replace(/\s/g, '');
                  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(sanitizedQuery)}&client_id=${unsplashAccessKey}&per_page=${numSlides+10}`; // Request up to 12 images
                  const res = await fetch(endpoint);
                  const data = await res.json();
                  imageUrl = data.results.map((i: any) => i.urls?.regular || i.urls?.small);
                  // const sanitizedPrompt = imagePrompt.replace(/\s/g, '');
                  // imageUrl = `https://picsum.photos/seed/google-${sanitizedPrompt}/1280/720`;
              }
              // FIX: Reassigning the background object to a new ImageBackground to avoid type conflicts.
              background = { type: 'image', value: imageUrl };
          }

          return {
            id: slideId,
            title: content.title || 'Untitled Slide',
            content: content.content || [],
            background: background,
            titleStyle: defaultTitleStyle,
            contentStyle: defaultContentStyle,
          };
        })
      );
      
      const newPresentation: Presentation = {
        id: Date.now().toString(),
        userId: user.id,
        title: presentationTitle,
        slides,
        theme: selectedTheme,
        createdAt: new Date().toISOString(),
      };

      const savedPresentation = apiService.savePresentation(newPresentation);
      onPresentationGenerated(savedPresentation);

    } catch (err) {
      setError('Failed to generate presentation. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const themes = ['Default', 'Black', 'Corporate Blue', 'Modern Dark', 'Creative', 'Minimalist', 'Tech Startup', 'Bold & Bright', 'Nature'];
  const themeColors: { [key: string]: string } = {
    Default: 'bg-blue-500', Black: 'bg-black', 'Corporate Blue': 'bg-blue-800', 'Modern Dark': 'bg-gray-800',
    Creative: 'bg-orange-500', Minimalist: 'bg-gray-200', 'Tech Startup': 'bg-sky-500', 'Bold & Bright': 'bg-pink-600', Nature: 'bg-green-600'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <LogoIcon className="h-6 w-6 text-indigo-600" />
              AI Presentation Generator
            </h1>
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <ArrowLeftIcon className="w-5 h-5"/> Back to Dashboard
              </button>
              <button onClick={onLogout} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <LogoutIcon className="w-5 h-5"/>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create a presentation about anything</h2>
          <p className="text-gray-500 mt-2">Provide a title, choose your content source, and our AI will do the rest.</p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md space-y-6">
          <div>
            <label className="font-semibold text-gray-700">Presentation Title*</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 'The Future of Renewable Energy'"
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>

          <div>
              <label className="font-semibold text-gray-700">Content Source</label>
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1">
                  <button onClick={() => setSource('ai')} className={`px-4 py-2 rounded-md font-medium text-sm ${source === 'ai' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>Generate with AI</button>
                  <button onClick={() => setSource('text')} className={`px-4 py-2 rounded-md font-medium text-sm ${source === 'text' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>From Text</button>
                  <button onClick={() => setSource('file')} className={`px-4 py-2 rounded-md font-medium text-sm ${source === 'file' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>From File</button>
              </div>
              {source === 'ai' && <p className="text-xs text-gray-500 mt-2">The AI will generate the entire presentation content based on your title.</p>}
              {source === 'text' && (
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste or write your content here. The AI will structure it into slides."
                  className="mt-2 w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  rows={5}
                />
              )}
              {source === 'file' && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".txt,.doc,.pdf"
                    onChange={e => setUploadedFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">.txt, .doc, and .pdf files are supported.</p>
                </div>
              )}
          </div>

          <div>
              <label className="font-semibold text-gray-700">Number of Slides ({numSlides})</label>
              <input 
                type="range" 
                min="3" 
                max="15" 
                value={numSlides}
                onChange={(e) => setNumSlides(parseInt(e.target.value))}
                className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
              />
          </div>
          
          <div>
            <label className="font-semibold text-gray-700">Image Source</label>
            <div className="mt-2 flex items-center space-x-6">
              <div className="flex items-center">
                <input id="ai-images" type="radio" value="ai" name="imageSource" checked={imageSource === 'ai'} onChange={() => setImageSource('ai')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                <label htmlFor="ai-images" className="ml-2 block text-sm text-gray-900">Generate with AI</label>
              </div>
              <div className="flex items-center">
                <input id="google-images" type="radio" value="google" name="imageSource" checked={imageSource === 'google'} onChange={() => setImageSource('google')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                <label htmlFor="google-images" className="ml-2 block text-sm text-gray-900">Google Search</label>
              </div>
              <div className="flex items-center">
                <input id="no-images" type="radio" value="none" name="imageSource" checked={imageSource === 'none'} onChange={() => setImageSource('none')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                <label htmlFor="no-images" className="ml-2 block text-sm text-gray-900">No Images</label>
              </div>
            </div>
          </div>

          <div>
              <label className="font-semibold text-gray-700">Select a Theme</label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {themes.map(theme => (
                      <div key={theme} onClick={() => setSelectedTheme(theme)} className={`cursor-pointer rounded-lg border-2 ${selectedTheme === theme ? 'border-indigo-600' : 'border-gray-300'}`}>
                          <div className={`w-full h-12 rounded-t-md ${themeColors[theme]}`}></div>
                          <p className="text-center text-sm py-2">{theme}</p>
                      </div>
                  ))}
              </div>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
          >
              {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
              ) : (
                  'Generate Presentation'
              )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreatePresentationPage;