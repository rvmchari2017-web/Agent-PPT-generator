import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Presentation, Slide, Background, TextStyle, ImageBackground, GradientBackground, ColorBackground } from '../../types';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { ArrowLeftIcon, PlusIcon, TrashIcon, ArrowRightIcon } from '../common/icons';

// Props for the EditorPage component
interface EditorPageProps {
  presentationId: string;
  onBack: () => void;
}

// Default text styles for new slides, used as a fallback.
const defaultTitleStyle: TextStyle = { fontSize: '48px', fontFamily: 'Arial', color: '#000000', bold: true, italic: false, underline: false };
const defaultContentStyle: TextStyle = { fontSize: '24px', fontFamily: 'Arial', color: '#333333', bold: false, italic: false, underline: false };

// Component for editing a presentation
const EditorPage: React.FC<EditorPageProps> = ({ presentationId, onBack }) => {
  // State for presentation data, current slide index, and UI status
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'content' | 'background'>('content');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for new features
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [gallerySearchQuery, setGallerySearchQuery] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch and deeply validate presentation data on component mount
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentSlideIndex(0);
    
    // Use a timeout to simulate network latency and show loading state
    const timerId = setTimeout(() => {
      const data = apiService.getPresentation(presentationId);
      if (data) {
        const slides = Array.isArray(data.slides) ? data.slides : [];
        
        // Deeply validate and clean each slide to provide default values for missing or malformed properties.
        const cleanedSlides = slides.map((slide: any, index: number) => {
          const defaultBg: Background = { type: 'color', value: '#ffffff' };
          let background = slide?.background && typeof slide.background.type === 'string' ? slide.background : defaultBg;
          // Ensure new properties exist
          if (background.type === 'image') {
              background.opacity = background.opacity ?? 1;
              background.blur = background.blur ?? 0;
          } else if (background.type === 'gradient') {
              background.color1 = background.color1 || '#ffffff';
              background.color2 = background.color2 || '#bbbbbb';
              background.angle = background.angle || 90;
          }

          const cleanSlide: Slide = {
              id: slide?.id || `${Date.now()}-${index}`,
              title: slide?.title || 'Untitled Slide',
              content: Array.isArray(slide?.content) ? slide.content : [],
              background: background,
              titleStyle: { ...defaultTitleStyle, ...(slide?.titleStyle || {}) },
              contentStyle: { ...defaultContentStyle, ...(slide?.contentStyle || {}) },
          };
          return cleanSlide;
        });

        setPresentation({ ...data, slides: cleanedSlides });
      } else {
        setError("Presentation not found.");
      }
      setIsLoading(false);
    }, 500); // 500ms delay

    // FIX: Add cleanup function to clear the timeout if the component unmounts before the timer fires.
    return () => {
      clearTimeout(timerId);
    };

  }, [presentationId]);

  // Update AI image prompt when slide changes
  useEffect(() => {
    if (presentation?.slides[currentSlideIndex]) {
      setAiImagePrompt(presentation.slides[currentSlideIndex].title);
    }
  }, [currentSlideIndex, presentation]);

  // Handler to save the presentation
  const handleSave = () => {
    if (presentation) {
      apiService.savePresentation(presentation);
      alert('Presentation Saved!');
    }
  };

  // Update a property of a specific slide using a functional update for stability
  const updateSlide = useCallback((slideIndex: number, updatedProps: Partial<Slide>) => {
    setPresentation(p => {
      if (!p) return null;
      const newSlides = [...p.slides];
      if (newSlides[slideIndex]) {
        newSlides[slideIndex] = { ...newSlides[slideIndex], ...updatedProps };
      }
      return { ...p, slides: newSlides };
    });
  }, []);

  // Handlers for slide navigation
  const goToNextSlide = () => {
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  // Handler to add a new slide
  const addSlide = useCallback(() => {
    // FIX: Refactored to perform two separate state updates for stability.
    if (!presentation) return;
    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide Title',
      content: ['New slide content.'],
      background: { type: 'color', value: '#ffffff' },
      titleStyle: presentation.slides[0]?.titleStyle || defaultTitleStyle,
      contentStyle: presentation.slides[0]?.contentStyle || defaultContentStyle,
    };
    
    setPresentation(p => p ? { ...p, slides: [...p.slides, newSlide] } : null);
    setCurrentSlideIndex(presentation.slides.length);
  }, [presentation]);

  // Handler to delete the current slide
  const deleteSlide = useCallback(() => {
    // FIX: Refactored to perform two separate state updates for stability.
    if (!presentation || presentation.slides.length <= 1) return;
    
    const updatedSlides = presentation.slides.filter((_, index) => index !== currentSlideIndex);
    setPresentation({ ...presentation, slides: updatedSlides });

    // Adjust index after the slides have been updated
    setCurrentSlideIndex(prev => Math.min(prev, updatedSlides.length - 1));
  }, [presentation, currentSlideIndex]);


  // Handler to change slide background
  const changeBackground = useCallback((newBackground: Background) => {
    updateSlide(currentSlideIndex, { background: newBackground });
  }, [currentSlideIndex, updateSlide]);

  // Handler to regenerate AI background image
  const regenerateImage = useCallback(async () => {
    if (!presentation?.slides[currentSlideIndex] || !aiImagePrompt) return;
    
    setIsGenerating(true);
    try {
        const imageUrl = await geminiService.generateImage(aiImagePrompt);
        const newBackground: ImageBackground = { type: 'image', value: imageUrl, opacity: 1, blur: 0 };
        changeBackground(newBackground);
    } catch(error) {
        console.error("Image generation failed:", error);
        alert("Failed to generate a new image. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  }, [presentation, aiImagePrompt, changeBackground]);
  
  // Primary image search provider using SerpApi
  const searchWithSerpApi = async (query: string): Promise<string[]> => {
    const SERPAPI_KEY = '279935e74a0f471d87a2df17492ac3c88c92b80ec7274214e293f06ca96cdd09';
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=isch&api_key=${SERPAPI_KEY}`;
    console.log('Trying primary image provider: SerpApi...');
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`SerpApi request failed with status ${response.status}`);
    }
    const data = await response.json();
    const imageUrls = data.images_results?.map((img: any) => img.thumbnail) || [];
    if (imageUrls.length === 0) {
        throw new Error('SerpApi returned no results.');
    }
    return imageUrls;
  };

  // Fallback image provider using a placeholder service
  const searchWithFallback = async (query: string): Promise<string[]> => {
    console.log('Trying fallback image provider...');
    // Use a placeholder service like picsum.photos, seeding with the query to get varied results
    const sanitizedQuery = query.replace(/\s/g, '');
    const imageUrls = Array.from({ length: 12 }, (_, i) => `https://picsum.photos/seed/${sanitizedQuery}${i}/400/300`);
    // Add a small delay to simulate a network request
    await new Promise(resolve => setTimeout(resolve, 300));
    return imageUrls;
  };


  // Handler for web image search with fallback logic
  const handleImageSearch = async () => {
    if (!gallerySearchQuery.trim()) return;
    setIsSearching(true);
    setGalleryImages([]);

    const searchProviders = [searchWithSerpApi, searchWithFallback];
    let imagesFound = false;

    for (const provider of searchProviders) {
      try {
        const imageUrls = await provider(gallerySearchQuery);
        if (imageUrls && imageUrls.length > 0) {
          setGalleryImages(imageUrls);
          imagesFound = true;
          break; // Success, exit the loop
        }
      } catch (error) {
        console.warn(`An image provider failed:`, error);
        // Continue to the next provider
      }
    }

    if (!imagesFound) {
        console.error("All image providers failed.");
        alert("Could not fetch images. Please try again later.");
    }

    setIsSearching(false);
  };
  
  // Handler for selecting an image from the gallery
  const selectImageFromGallery = (url: string) => {
      const newBackground: ImageBackground = { type: 'image', value: url, opacity: 1, blur: 0 };
      changeBackground(newBackground);
      setIsGalleryOpen(false);
  };
  
  // Handlers for drag-and-drop slide reordering
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null || !presentation) return;
    
    let newSlides = [...presentation.slides];
    const draggedItemContent = newSlides.splice(dragItem.current, 1)[0];
    newSlides.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    
    setPresentation({...presentation, slides: newSlides});
  };

  // Handler to trigger the file input click
  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };
  
  // Handler for when a user selects a file to upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const imageUrl = e.target?.result as string;
              if (imageUrl) {
                  const newBackground: ImageBackground = { type: 'image', value: imageUrl, opacity: 1, blur: 0 };
                  changeBackground(newBackground);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // Render a loading state while fetching data
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // Render an error state if presentation is not found
  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
            <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Back to Dashboard</button>
        </div>
    );
  }

  if (!presentation) { return null; }

  // Gracefully handle presentations with no slides
  if (presentation.slides.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-center p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">This presentation has no slides.</h2>
            <p className="text-gray-600 mb-6">Let's add one to get started!</p>
            <div className="flex gap-4">
                <button onClick={addSlide} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"><PlusIcon className="w-5 h-5" />Add Slide</button>
                <button onClick={onBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Back to Dashboard</button>
            </div>
        </div>
    );
  }
  
  // FIX: Added a guard clause to prevent an out-of-bounds array access, which can happen for a single frame during a delete operation before the index is updated.
  if (currentSlideIndex >= presentation.slides.length) {
    return null;
  }

  const currentSlide = presentation.slides[currentSlideIndex];
  
  const getComputedStyle = (style: TextStyle) => {
    if (currentSlide.background.type === 'image' || currentSlide.background.type === 'gradient') {
      return { ...style, color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0,0,0,0.7)' };
    }
    return style;
  };

  const getBackgroundStyle = () => {
    const bg = currentSlide.background;
    if (bg.type === 'color') return { backgroundColor: bg.value };
    if (bg.type === 'gradient') return { backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.color1}, ${bg.color2})` };
    return { backgroundColor: '#000' };
  }

  const computedTitleStyle = getComputedStyle(currentSlide.titleStyle);
  const computedContentStyle = getComputedStyle(currentSlide.contentStyle);

  // Main editor JSX
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Editor Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeftIcon className="w-5 h-5" />Back</button>
          <h1 className="text-lg font-semibold text-gray-800 truncate">{presentation.title}</h1>
        </div>
        <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Export</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Save</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex overflow-hidden">
        {/* Main Slide Preview */}
        <main className="flex-grow p-4 md:p-8 flex items-center justify-center">
          <div 
            className="aspect-video w-full max-w-5xl rounded-lg shadow-lg flex flex-col justify-center items-center p-8 relative overflow-hidden"
            style={getBackgroundStyle()}
          >
            {currentSlide.background.type === 'image' && (
                <img src={currentSlide.background.value} className="absolute top-0 left-0 w-full h-full object-cover z-0" style={{ opacity: currentSlide.background.opacity, filter: `blur(${currentSlide.background.blur}px)` }} alt="Slide background"/>
            )}
            <div className="relative z-10 text-center w-full">
              <h2 className="font-bold break-words" style={{...computedTitleStyle, fontStyle: computedTitleStyle.italic ? 'italic' : 'normal', fontWeight: computedTitleStyle.bold ? 'bold' : 'normal', textDecoration: computedTitleStyle.underline ? 'underline' : 'none' }}>
                {currentSlide.title}
              </h2>
              <ul className="mt-6 space-y-2 text-left max-w-2xl mx-auto break-words" style={{...computedContentStyle, fontStyle: computedContentStyle.italic ? 'italic' : 'normal', fontWeight: computedContentStyle.bold ? 'bold' : 'normal', textDecoration: computedContentStyle.underline ? 'underline' : 'none'}}>
                {currentSlide.content.map((point, i) => <li key={i}>{point}</li>)}
              </ul>
            </div>
            {/* Slide Navigation Arrows */}
            <button onClick={goToPrevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30" disabled={currentSlideIndex === 0}><ArrowLeftIcon /></button>
            <button onClick={goToNextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30" disabled={currentSlideIndex === presentation.slides.length - 1}><ArrowRightIcon /></button>
            <span className="absolute bottom-2 right-4 text-xs font-semibold text-white bg-black/40 px-2 py-1 rounded-md">Slide {currentSlideIndex + 1} of {presentation.slides.length}</span>
          </div>
        </main>
        
        {/* Editing Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto flex-shrink-0">
          <div className="flex border-b border-gray-200 mb-4">
            <button onClick={() => setActiveTab('content')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Content</button>
            <button onClick={() => setActiveTab('background')} className={`flex-1 py-2 text-sm font-medium ${activeTab === 'background' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Background</button>
          </div>
          
          {activeTab === 'content' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Slide Title</label>
                <textarea value={currentSlide.title} onChange={(e) => updateSlide(currentSlideIndex, { title: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm" rows={2}/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Slide Content</label>
                <textarea value={currentSlide.content.join('\n')} onChange={(e) => updateSlide(currentSlideIndex, { content: e.target.value === '' ? [] : e.target.value.split('\n') })} className="mt-1 w-full p-2 border border-gray-300 rounded-md text-sm" rows={5}/>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div>
                <label className="text-sm font-semibold text-gray-700">Background Type</label>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
                    <button onClick={() => changeBackground({ type: 'color', value: '#ffffff' })} className={`px-2 py-1 rounded-md text-xs ${currentSlide.background.type === 'color' ? 'bg-white shadow' : ''}`}>Solid</button>
                    <button onClick={() => changeBackground({ type: 'gradient', color1: '#ffffff', color2: '#a0aec0', angle: 90 })} className={`px-2 py-1 rounded-md text-xs ${currentSlide.background.type === 'gradient' ? 'bg-white shadow' : ''}`}>Gradient</button>
                    <button onClick={() => changeBackground({ type: 'image', value: `https://picsum.photos/seed/${currentSlide.id}/1280/720`, opacity: 1, blur: 0 })} className={`px-2 py-1 rounded-md text-xs ${currentSlide.background.type === 'image' ? 'bg-white shadow' : ''}`}>Image</button>
                </div>
              </div>

              {currentSlide.background.type === 'color' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Color</label>
                  {/* FIX: Add a type check to ensure currentSlide.background is a ColorBackground before spreading. */}
                  <input type="color" value={currentSlide.background.value} onChange={(e) => { if(currentSlide.background.type === 'color') { changeBackground({ ...currentSlide.background, value: e.target.value }) }}} className="mt-1 w-full h-10 p-1 border border-gray-300 rounded-md"/>
                </div>
              )}
              {currentSlide.background.type === 'gradient' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Colors</label>
                    <div className="flex items-center gap-2 mt-1">
                      {/* FIX: Add a type check to ensure currentSlide.background is a GradientBackground before spreading. */}
                      <input type="color" value={currentSlide.background.color1} onChange={(e) => { if(currentSlide.background.type === 'gradient') { changeBackground({ ...currentSlide.background, color1: e.target.value }) } }} className="w-full h-10 p-1 border border-gray-300 rounded-md"/>
                      {/* FIX: Add a type check to ensure currentSlide.background is a GradientBackground before spreading. */}
                      <input type="color" value={currentSlide.background.color2} onChange={(e) => { if(currentSlide.background.type === 'gradient') { changeBackground({ ...currentSlide.background, color2: e.target.value }) } }} className="w-full h-10 p-1 border border-gray-300 rounded-md"/>
                    </div>
                  </div>
                   <div>
                    <label className="text-sm font-semibold text-gray-700">Angle ({currentSlide.background.angle}°)</label>
                    {/* FIX: Add a type check to ensure currentSlide.background is a GradientBackground before spreading. */}
                    <input type="range" min="0" max="360" value={currentSlide.background.angle} onChange={(e) => { if(currentSlide.background.type === 'gradient') { changeBackground({ ...currentSlide.background, angle: parseInt(e.target.value) }) } }} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                   </div>
                </div>
              )}
              {currentSlide.background.type === 'image' && (
                <div className="space-y-4">
                   <div className="p-2 border rounded-md">
                        <label className="text-xs font-semibold text-gray-600">Opacity</label>
                        {/* FIX: Add a type check to ensure currentSlide.background is an ImageBackground before spreading. */}
                        <input type="range" min="0" max="1" step="0.05" value={currentSlide.background.opacity} onChange={(e) => { if(currentSlide.background.type === 'image') { changeBackground({ ...currentSlide.background, opacity: parseFloat(e.target.value) }) } }} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                   </div>
                   <div className="p-2 border rounded-md">
                        <label className="text-xs font-semibold text-gray-600">Blur</label>
                        {/* FIX: Add a type check to ensure currentSlide.background is an ImageBackground before spreading. */}
                        <input type="range" min="0" max="20" step="1" value={currentSlide.background.blur} onChange={(e) => { if(currentSlide.background.type === 'image') { changeBackground({ ...currentSlide.background, blur: parseInt(e.target.value) }) } }} className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                   </div>
                   <div>
                       <label className="text-sm font-semibold text-gray-700">Change Image</label>
                       <div className="mt-2 space-y-2">
                           <textarea placeholder="Describe the image to generate..." value={aiImagePrompt} onChange={e => setAiImagePrompt(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" rows={2}/>
                           <button onClick={regenerateImage} disabled={isGenerating} className="w-full px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isGenerating ? (<><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Generating...</>) : 'Regenerate with AI'}
                           </button>
                           <button onClick={() => setIsGalleryOpen(true)} className="w-full px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-400 rounded-md hover:bg-gray-100">Search Web</button>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" className="hidden" />
                           <button onClick={handleUploadClick} className="w-full px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-400 rounded-md hover:bg-gray-100">Upload Image</button>
                       </div>
                   </div>
                </div>
              )}
            </div>
          )}
          
          <hr className="my-6"/>
          
          <div className="flex items-center gap-2">
             <button onClick={addSlide} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"><PlusIcon className="w-4 h-4"/> Add Slide</button>
             <button onClick={deleteSlide} disabled={presentation.slides.length <= 1} className="p-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"><TrashIcon className="w-5 h-5"/></button>
          </div>
        </aside>
      </div>

      {/* Slide Thumbnails */}
      <footer className="bg-white border-t border-gray-200 p-2 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {presentation.slides.map((slide, index) => (
            <div 
              key={slide.id}
              draggable
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleDragSort}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => setCurrentSlideIndex(index)}
              className={`w-32 h-20 flex-shrink-0 rounded-md border-2 cursor-pointer relative ${currentSlideIndex === index ? 'border-indigo-600' : 'border-gray-400'}`}
              style={ slide.background.type === 'color' ? { backgroundColor: slide.background.value } : slide.background.type === 'gradient' ? { backgroundImage: `linear-gradient(${slide.background.angle}deg, ${slide.background.color1}, ${slide.background.color2})` } : {} }
            >
              {slide.background.type === 'image' && <img src={slide.background.value} className="w-full h-full object-cover rounded-sm" />}
              <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
              <span className="absolute bottom-1 right-1 text-xs font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">{index + 1}</span>
            </div>
          ))}
        </div>
      </footer>
      
      {/* Image Search Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Search for Images</h3>
                    <button onClick={() => setIsGalleryOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-4">
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleImageSearch(); }}>
                        <input type="text" value={gallerySearchQuery} onChange={e => setGallerySearchQuery(e.target.value)} placeholder="e.g., 'Modern office'" className="flex-grow px-3 py-2 border rounded-md"/>
                        <button type="submit" disabled={isSearching} className="px-4 py-2 bg-indigo-600 text-white rounded-md w-28 disabled:bg-indigo-400">
                            {isSearching ? <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Search'}
                        </button>
                    </form>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                  {isSearching && galleryImages.length === 0 && <p className="text-center text-gray-500">Searching...</p>}
                  {!isSearching && galleryImages.length === 0 && <p className="text-center text-gray-500">No images found. Try a different search term.</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {galleryImages.map(url => (
                          <img key={url} src={url} onClick={() => selectImageFromGallery(url)} className="w-full h-32 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"/>
                      ))}
                  </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;