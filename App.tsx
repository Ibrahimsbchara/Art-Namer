import React, { useState, useRef } from 'react';
import { generateArtName, NameStyle } from './services/geminiService';

type ImageStatus = 'queued' | 'generating' | 'completed' | 'error';

type ProcessedImage = {
    id: string;
    base64: string;
    mimeType: string;
    name: string;
    status: ImageStatus;
    suggestedName?: string;
    error?: string;
};

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.125l-2.25 2.25m0 0l-2.25-2.25m2.25 2.25V17.25m0 0h-2.25" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
);


const App: React.FC = () => {
    const [images, setImages] = useState<ProcessedImage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [urlInput, setUrlInput] = useState<string>('');
    const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
    const [nameStyle, setNameStyle] = useState<NameStyle>('Artistic');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFiles = (files: FileList | null) => {
        if (!files) return;
        setError('');
        const filePromises = Array.from(files).map(file => {
             if (!file.type.startsWith('image/')) {
                console.warn(`File "${file.name}" is not a valid image file.`);
                return null;
            }
            return new Promise<{ base64: string; mimeType: string; name: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = (reader.result as string).split(',')[1];
                    resolve({ base64: base64String, mimeType: file.type, name: file.name });
                };
                reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(filePromises.filter(p => p !== null))
        .then(results => {
            const processedImages = results.map(res => ({
                ...res,
                id: `${Date.now()}-${Math.random()}`,
                status: 'queued' as ImageStatus,
            }));
            setImages(prev => [...prev, ...processedImages]);
        }).catch(err => {
            setError(err.message);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(event.target.files);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-brand-primary');
        if (isLoading || isFetchingUrl) return;
        processFiles(event.dataTransfer.files);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (isLoading || isFetchingUrl) return;
        event.currentTarget.classList.add('border-brand-primary');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-brand-primary');
    };
    
    const handleFetchFromUrls = async () => {
        const urls = urlInput.split('\n').map(u => u.trim()).filter(Boolean);
        if (urls.length === 0) {
            setError("Please enter at least one image URL.");
            return;
        }

        setIsFetchingUrl(true);
        setError('');

        const urlPromises = urls.map(async (url): Promise<ProcessedImage | { url: string; error: any }> => {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            try {
                new URL(url); // Basic validation on original URL
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.startsWith('image/')) throw new Error('URL does not point to a valid image file.');
                const blob = await response.blob();
                const base64String = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(blob);
                });
                const fileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0] || 'image-from-url';
                return { base64: base64String, mimeType: blob.type, name: fileName, id: `${Date.now()}-${Math.random()}`, status: 'queued' as ImageStatus };
            } catch (err) {
                 console.error(`Failed to fetch ${url}:`, err);
                 return { url, error: err };
            }
        });

        const results = await Promise.all(urlPromises);
        const successfulFetches = results.filter((r): r is ProcessedImage => r !== null && 'base64' in r);
        const failedFetches = results.filter(r => r !== null && 'url' in r);

        if (successfulFetches.length > 0) {
            setImages(prev => [...prev, ...successfulFetches]);
        }
        
        if (failedFetches.length > 0) {
            const fetchErrorCount = failedFetches.length;
            const failedUrlsList = failedFetches.map(f => `- ${(f as {url: string}).url}`).join('\n');
            const errorMessage = `Could not fetch ${fetchErrorCount} image(s). The proxy may have failed or the URL is invalid.\n\nPlease try downloading these images to your device and uploading them directly.\n\nFailed URLs:\n${failedUrlsList}`;
            setError(errorMessage);
        }
        
        setUrlInput('');
        setIsFetchingUrl(false);
    };

    const handleGenerateAllNames = async () => {
        const imagesToProcess = images.filter(img => img.status === 'queued');
        if (imagesToProcess.length === 0) return;

        setIsLoading(true);
        setError('');

        setImages(prev => prev.map(img => img.status === 'queued' ? { ...img, status: 'generating' } : img));

        const generationPromises = imagesToProcess.map(async (image) => {
            try {
                const name = await generateArtName(image.base64, image.mimeType, nameStyle);
                return { id: image.id, status: 'completed' as ImageStatus, suggestedName: name };
            } catch (err) {
                return { id: image.id, status: 'error' as ImageStatus, error: (err as Error).message };
            }
        });
        
        for (const promise of generationPromises) {
             const result = await promise;
             setImages(prev => prev.map(img => img.id === result.id ? { ...img, ...result } : img));
        }

        setIsLoading(false);
    };
    
    const handleCopyToClipboard = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
    };

    const handleCopyAll = () => {
        const textToCopy = images
            .filter(img => img.status === 'completed' && img.suggestedName)
            .map(img => `${img.name}: ${img.suggestedName}`)
            .join('\n');
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopiedStates({ all: true });
            setTimeout(() => setCopiedStates({ all: false }), 2000);
        }
    };
    
    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const clearAll = () => {
        setImages([]);
        setError('');
        setIsLoading(false);
        setCopiedStates({});
    };

    const queuedCount = images.filter(i => i.status === 'queued').length;
    const completedCount = images.filter(i => i.status === 'completed').length;

    return (
        <div className="min-h-screen bg-base-100 text-white font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-7xl text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-light text-transparent bg-clip-text">
                    Art Namer AI
                </h1>
                <p className="text-gray-300 mt-2 text-lg">Batch name your masterpieces with the power of AI.</p>
            </header>
            
             <main className="w-full max-w-7xl">
                {/* Input Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-base-200 p-6 rounded-2xl shadow-lg mb-8">
                    {/* File Uploader */}
                    <div 
                        className="w-full h-48 bg-base-300 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-500 transition-all duration-300 relative overflow-hidden cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                         <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" multiple disabled={isLoading || isFetchingUrl} />
                         <div className="text-center text-gray-400">
                            <UploadIcon className="w-12 h-12 mx-auto" />
                            <p className="mt-2 font-semibold">Click or drag & drop images</p>
                            <p className="text-sm">Upload multiple files at once</p>
                        </div>
                    </div>
                    {/* URL Input */}
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste image URLs here, one per line..."
                            className="flex-grow bg-base-300 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-shadow resize-none disabled:bg-base-300/50"
                            rows={5}
                             disabled={isLoading || isFetchingUrl}
                        />
                         <button onClick={handleFetchFromUrls} className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!urlInput || isFetchingUrl || isLoading}>
                             {isFetchingUrl ? 'Fetching...' : 'Fetch from URLs'}
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">An error occurred: </strong>
                        <span className="block sm:inline whitespace-pre-wrap">{error}</span>
                         <button onClick={() => setError('')} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                            <svg className="fill-current h-6 w-6 text-red-300" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                        </button>
                    </div>
                )}

                {/* Controls and Gallery Section */}
                {images.length > 0 && (
                    <div className="bg-base-200 p-6 rounded-2xl shadow-lg">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-base-300 pb-6">
                             <div>
                                <label htmlFor="name-style" className="block text-sm font-medium text-gray-300 mb-1">Name Style</label>
                                <select id="name-style" value={nameStyle} onChange={(e) => setNameStyle(e.target.value as NameStyle)} className="w-full sm:w-auto bg-base-300 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-shadow">
                                    <option>Artistic</option>
                                    <option>Descriptive</option>
                                    <option>Modern & Edgy</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button onClick={handleGenerateAllNames} disabled={queuedCount === 0 || isLoading} className="flex-1 py-2 px-4 bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold rounded-lg transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {isLoading ? 'Generating...' : `Generate ${queuedCount > 0 ? `(${queuedCount})` : ''} Names`}
                                </button>
                                <button onClick={clearAll} className="py-2 px-4 bg-base-300 hover:bg-base-100 text-white font-semibold rounded-lg transition-colors">Clear All</button>
                            </div>
                        </div>

                        {/* Gallery */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map(image => (
                                <div key={image.id} className="bg-base-300 rounded-lg overflow-hidden shadow-md relative group">
                                    <button onClick={() => removeImage(image.id)} className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    <div className="aspect-square w-full bg-base-100 flex items-center justify-center">
                                         <img src={`data:${image.mimeType};base64,${image.base64}`} alt={image.name} className="w-full h-full object-cover"/>
                                    </div>
                                    <div className="p-3 text-sm">
                                        <p className="font-semibold truncate text-white" title={image.name}>{image.name}</p>
                                        {image.status === 'generating' && <p className="text-blue-400">Generating...</p>}
                                        {image.status === 'error' && <p className="text-red-400 truncate" title={image.error}>Error: {image.error}</p>}
                                        {image.status === 'completed' && image.suggestedName && (
                                            <div className="flex items-center justify-between gap-1 mt-1">
                                                <p className="text-gray-200 truncate font-medium">{image.suggestedName}</p>
                                                <button onClick={() => handleCopyToClipboard(image.id, image.suggestedName!)} className="p-1 rounded hover:bg-base-100 text-gray-400 hover:text-white">
                                                    {copiedStates[image.id] ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        )}
                                         {image.status === 'queued' && <p className="text-gray-400">Queued</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {completedCount > 0 && (
                            <div className="mt-6 text-center">
                                <button onClick={handleCopyAll} className="inline-flex items-center gap-2 bg-base-300 hover:bg-base-100 px-4 py-2 rounded-lg transition-colors">
                                    {copiedStates['all'] ? <><CheckIcon className="w-5 h-5 text-green-400"/> Copied All!</> : <><CopyIcon className="w-5 h-5" /> Copy All Names</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Initial State Message */}
                {images.length === 0 && (
                     <p className="text-gray-400 text-center text-lg mt-16">Upload some images to get started!</p>
                )}

            </main>
        </div>
    );
};

export default App;