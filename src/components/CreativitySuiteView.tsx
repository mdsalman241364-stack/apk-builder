import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Mail, 
  Heart, 
  FileText, 
  Copy, 
  Check, 
  Loader2, 
  Download,
  Share2,
  Wand2,
  RefreshCw
} from 'lucide-react';
import { Note } from '../types';
import { getApiHeaders } from '../utils/apiUtils';

interface CreativitySuiteViewProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'updatedAt'>) => void;
}

export const CreativitySuiteView: React.FC<CreativitySuiteViewProps> = React.memo(({
  notes,
  onAddNote,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'image' | 'drafts' | 'notes'>('image');

  // AI Image Generator State
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('3D Anime Avatar');

  // AI Drafts & Creativity State
  const [creativityType, setCreativityType] = useState<'email_msg' | 'caption' | 'poem_shayari' | 'summarize' | 'translate' | 'brainstorm'>('poem_shayari');
  const [creativePrompt, setCreativePrompt] = useState('');
  const [extraTone, setExtraTone] = useState('');
  const [creativeResult, setCreativeResult] = useState('');
  const [isCreativeLoading, setIsCreativeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // New Note State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'Work' | 'Personal' | 'Ideas' | 'Voice Notes' | 'Meeting Summaries'>('Ideas');

  const stylePresets = [
    '3D Anime Avatar',
    'Cyberpunk Neon Girl',
    '3D Pixar Cute Bestie',
    'Realistic Portrait',
    'Fantasy Dreamscape',
    'Kawaii Chibi Art'
  ];

  // Handle Free Real-time AI Image Generation (Pollinations AI + Gemini Server Fallback)
  const handleGenerateImage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToUse = customPrompt || imagePrompt;
    if (!promptToUse.trim() || isImageLoading) return;

    setIsImageLoading(true);
    setGeneratedImage(null);

    const fullPrompt = `${promptToUse}, ${selectedStyle}, masterpiece, 8k resolution, highly detailed, vibrant lighting`;
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

    try {
      // Test loading pollinations image first
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = pollinationsUrl;

      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = async () => {
          // If pollinations fails, fallback to server Gemini generate-image API
          try {
            const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: fullPrompt, aspectRatio: '1:1' }),
            });
            const data = await res.json();
            if (data.imageUrl) {
              setGeneratedImage(data.imageUrl);
              resolve(true);
            } else {
              reject(new Error('Image generation failed'));
            }
          } catch (err) {
            reject(err);
          }
        };
      });

      setGeneratedImage(pollinationsUrl);
    } catch (err) {
      console.error('Error generating image:', err);
      // Set direct pollinations URL as fallback
      setGeneratedImage(pollinationsUrl);
    } finally {
      setIsImageLoading(false);
    }
  };

  // Handle AI Text Creativity
  const handleGenerateCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creativePrompt.trim() || isCreativeLoading) return;
    setIsCreativeLoading(true);
    setCreativeResult('');

    try {
      const res = await fetch('/api/creativity', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          toolType: creativityType,
          prompt: creativePrompt,
          extra: extraTone,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setCreativeResult(data.result);
      }
    } catch (err) {
      console.error('Error generating creativity:', err);
    } finally {
      setIsCreativeLoading(false);
    }
  };

  const handleCopy = () => {
    if (!creativeResult) return;
    navigator.clipboard.writeText(creativeResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent) return;
    onAddNote({
      title: noteTitle,
      content: noteContent,
      category: noteCategory,
    });
    setNoteTitle('');
    setNoteContent('');
  };

  return (
    <div className="space-y-4 pb-24 px-4 max-w-2xl mx-auto pt-2">
      {/* Sub Navigation */}
      <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <button
          onClick={() => setActiveSubTab('image')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'image'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>AI Image Studio</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'drafts'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Drafts & Shayari</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'notes'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Smart Notes</span>
        </button>
      </div>

      {/* 1. AI IMAGE STUDIO TAB */}
      {activeSubTab === 'image' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-pink-500/20 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-100">DIGUU AI Image Generator</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Live 8K Engine ✨
              </span>
            </div>
            <p className="text-xs text-slate-300/80">
              Transform your prompt into 3D avatars, anime art, wallpapers, or avatars instantly!
            </p>
          </div>

          {/* Style Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {stylePresets.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
                  selectedStyle === style
                    ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => handleGenerateImage(e)} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Cute 3D anime girl avatar with purple glowing hair..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500/50"
              />
              <button
                type="submit"
                disabled={!imagePrompt.trim() || isImageLoading}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs disabled:opacity-50 shadow-md hover:scale-105 transition-all flex items-center gap-2"
              >
                {isImageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span>Generate</span>
              </button>
            </div>
          </form>

          {/* Loading Indicator */}
          {isImageLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-900/50 rounded-3xl border border-slate-800">
              <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
              <p className="text-xs text-pink-300 font-semibold animate-pulse">
                DIGUU AI is rendering your masterpiece... ✨
              </p>
            </div>
          )}

          {/* Generated Image Result Card */}
          {generatedImage && !isImageLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-3xl bg-slate-900 border border-pink-500/30 overflow-hidden shadow-2xl flex flex-col items-center space-y-3"
            >
              <div className="relative w-full max-w-md overflow-hidden rounded-2xl group shadow-xl">
                <img
                  src={generatedImage}
                  alt="AI Generated Result"
                  referrerPolicy="no-referrer"
                  className="w-full rounded-2xl object-cover aspect-square shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              <div className="flex items-center justify-between w-full max-w-md pt-1 px-1">
                <span className="text-[11px] text-pink-300 font-semibold">✨ DIGUU AI Image Engine</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateImage(undefined, imagePrompt)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <a
                    href={generatedImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="diguu_ai_art.jpg"
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 2. DRAFTS, CAPTIONS & SHAYARI TAB */}
      {activeSubTab === 'drafts' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCreativityType('poem_shayari')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                creativityType === 'poem_shayari' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              🌸 Poem / Shayari
            </button>
            <button
              onClick={() => setCreativityType('email_msg')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                creativityType === 'email_msg' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              ✉️ Email & Messages
            </button>
            <button
              onClick={() => setCreativityType('caption')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                creativityType === 'caption' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              📱 Social Captions
            </button>
            <button
              onClick={() => setCreativityType('summarize')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                creativityType === 'summarize' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              📑 Summarizer
            </button>
          </div>

          <form onSubmit={handleGenerateCreative} className="space-y-3">
            <textarea
              rows={3}
              placeholder={
                creativityType === 'poem_shayari'
                  ? 'Describe what you want the poem/shayari about (e.g. Friendship, Motivation, Love)...'
                  : creativityType === 'email_msg'
                  ? 'Enter key points for email/message (e.g. Request sick leave for tomorrow)...'
                  : 'Enter topic or text...'
              }
              value={creativePrompt}
              onChange={(e) => setCreativePrompt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-pink-500/50"
            />

            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Style / Tone (e.g. Hearttouching, Professional, Romantic)"
                value={extraTone}
                onChange={(e) => setExtraTone(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />

              <button
                type="submit"
                disabled={!creativePrompt.trim() || isCreativeLoading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCreativeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate</span>
              </button>
            </div>
          </form>

          {/* Generated Result Output Box */}
          {creativeResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-3xl bg-slate-900 border border-pink-500/30 space-y-3 shadow-xl relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300">DIGUU Creative Output</span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-pink-300 text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="text-xs text-slate-100 leading-relaxed whitespace-pre-line p-3 rounded-2xl bg-slate-950 border border-slate-800">
                {creativeResult}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* 3. SMART NOTES TAB */}
      {activeSubTab === 'notes' && (
        <div className="space-y-4">
          <form onSubmit={handleSaveNote} className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold text-slate-400">Add New Note</h3>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="Ideas">Ideas 💡</option>
                <option value="Work">Work 💼</option>
                <option value="Personal">Personal 🏠</option>
                <option value="Voice Notes">Voice Notes 🎙️</option>
                <option value="Meeting Summaries">Meeting Summaries 📑</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Note Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              required
            />

            <textarea
              rows={3}
              placeholder="Note Content or Voice Note Transcript..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200"
              required
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold shadow-md hover:bg-pink-600"
              >
                Save Note
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-md space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">{n.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">
                    {n.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 leading-relaxed whitespace-pre-line mt-1">{n.content}</p>
                <span className="text-[10px] text-slate-400 block pt-1">{n.updatedAt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

CreativitySuiteView.displayName = 'CreativitySuiteView';

