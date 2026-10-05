'use client';

import { useState } from 'react';
import { useProductImage } from '../hooks/useProductImage';

// ── Constants ──────────────────────────────────────────────────────────────

const STYLES = [
  {
    label: '📷 Studio',
    value: 'studio product photography, clean white background, professional lighting, soft shadows',
  },
  {
    label: '🏠 Lifestyle',
    value: 'lifestyle product photography, natural home environment, warm ambient lighting',
  },
  {
    label: '✨ 3D Render',
    value: '3D product render, glossy surfaces, dramatic lighting, floating in space, reflections',
  },
  {
    label: '🎨 Flat Lay',
    value: 'minimalist flat lay overhead shot, pastel background, editorial fashion photography',
  },
  {
    label: '💎 Luxury',
    value: 'luxury product photography, dark moody background, cinematic, gold accents',
  },
  {
    label: '🌿 Outdoor',
    value: 'outdoor adventure photography, natural light, action shot, vibrant colors',
  },
];

const SIZES = [
  { label: 'Square',    sub: '1024×1024', w: 1024, h: 1024 },
  { label: 'Landscape', sub: '1344×768',  w: 1344, h: 768  },
  { label: 'Portrait',  sub: '768×1344',  w: 768,  h: 1344 },
];

const CATEGORIES = [
  'Electronics',
  'Fashion & Apparel',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Sports & Fitness',
  'Jewelry & Accessories',
  'Toys & Games',
  'Food & Beverage',
  'Pet Supplies',
  'Office & Stationery',
  'Automotive',
];

const MODELS = [
  { value: 'flux',          label: 'Flux (Best Quality)' },
  { value: 'turbo',         label: 'Turbo (Faster)'      },
  { value: 'flux-realism',  label: 'Flux Realism'        },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ProductImageGenerator() {
  const { imageUrl, prompt, isLoading, error, generate, reset } = useProductImage();

  // Form state
  const [name,        setName]        = useState('');
  const [category,    setCategory]    = useState('');
  const [color,       setColor]       = useState('');
  const [description, setDescription] = useState('');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [model,       setModel]       = useState('flux');
  const [seed,        setSeed]        = useState('');
  const [enhance,     setEnhance]     = useState(true);
  const [showAdv,     setShowAdv]     = useState(false);
  const [copied,      setCopied]      = useState(false);

  // Selection state
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].value);
  const [selectedSize,  setSelectedSize]  = useState(SIZES[0]);

  // History
  const [history, setHistory] = useState<{ url: string; name: string }[]>([]);

  // ── Handlers ──

  const handleGenerate = async () => {
    if (!name.trim()) return;

    // Build full style string including any extra prompt additions
    const fullStyle = extraPrompt.trim()
      ? `${selectedStyle}, ${extraPrompt.trim()}`
      : selectedStyle;

    await generate({
      name:        name.trim(),
      category,
      color:       color.trim(),
      description: description.trim(),
      style:       fullStyle,
      model,
      seed:        seed ? parseInt(seed) : undefined,
      enhance,
      width:       selectedSize.w,
      height:      selectedSize.h,
    });
  };

  // Add to history when image loads
  const handleImageLoad = () => {
    if (!imageUrl) return;
    setHistory((prev) => {
      const already = prev.find((h) => h.url === imageUrl);
      if (already) return prev;
      return [{ url: imageUrl, name }, ...prev].slice(0, 8);
    });
  };

  const handleCopyUrl = async () => {
    if (!imageUrl) return;
    await navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = !isLoading && name.trim().length > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#07090f] text-white">

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-6 text-center">
        <span className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Powered by Pollinations.ai · Free · No API Key
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-purple-300 to-indigo-400 bg-clip-text text-transparent mb-3">
          AI Product Image Generator
        </h1>
        <p className="text-slate-400 text-sm">
          Describe your product and generate stunning ecommerce photos instantly with Flux AI
        </p>
      </div>

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

        {/* ── Left: Form ── */}
        <div className="bg-[#0e1117] border border-white/[0.07] rounded-2xl overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Product Details</p>
              <p className="text-xs text-slate-500">Fill in your product info to generate</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">

            {/* Product Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Product Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canGenerate && handleGenerate()}
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition"
              />
            </div>

            {/* Category + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition"
                >
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Color / Material</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Matte Black"
                  className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Description / Features</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key features, use case, unique selling points…"
                rows={3}
                className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition resize-none"
              />
            </div>

            {/* Visual Style chips */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Visual Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedStyle(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedStyle === s.value
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                        : 'bg-[#151b27] border-white/[0.07] text-slate-400 hover:border-indigo-400/30 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Size */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Image Size</label>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`py-2 rounded-xl border text-center transition-all ${
                      selectedSize.label === s.label
                        ? 'bg-indigo-500/12 border-indigo-500/45 text-indigo-300'
                        : 'bg-[#151b27] border-white/[0.07] hover:border-indigo-400/30'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{s.label}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdv(!showAdv)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#151b27] border border-white/[0.07] rounded-xl text-sm text-slate-400 hover:text-slate-300 transition"
              >
                <span>⚙️ Advanced Options</span>
                <span className={`transition-transform duration-200 ${showAdv ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {showAdv && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Extra Prompt Details</label>
                    <input
                      type="text"
                      value={extraPrompt}
                      onChange={(e) => setExtraPrompt(e.target.value)}
                      placeholder="e.g. bokeh background, golden hour…"
                      className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Model</label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500/50 transition"
                      >
                        {MODELS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fixed Seed</label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="e.g. 42"
                        min={0}
                        max={999999}
                        className="bg-[#151b27] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 transition"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enhance}
                      onChange={(e) => setEnhance(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    Auto-enhance prompt with AI
                  </label>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                ⚠ {error}
              </p>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                  Generate Image
                </>
              )}
            </button>

          </div>
        </div>

        {/* ── Right: Result ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#0e1117] border border-white/[0.07] rounded-2xl overflow-hidden">

            {/* Result header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <span className="text-sm font-semibold text-white">Generated Image</span>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                imageUrl
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : isLoading
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}>
                {imageUrl ? 'Ready ✓' : isLoading ? 'Generating…' : 'Waiting'}
              </span>
            </div>

            {/* Image area */}
            <div className="aspect-square bg-[#151b27] relative flex items-center justify-center overflow-hidden">

              {/* Empty state */}
              {!imageUrl && !isLoading && (
                <div className="flex flex-col items-center gap-3 text-center p-10">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path strokeLinecap="round" d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="block text-slate-300 font-medium mb-1">Your AI image will appear here</span>
                    Fill in the form and click Generate
                  </p>
                </div>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#151b27]/95 backdrop-blur-sm z-10">
                  <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 animate-pulse">Generating with Flux AI…</p>
                  <p className="text-xs text-slate-600">This takes 10–20 seconds</p>
                </div>
              )}

              {/* Generated image */}
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  onLoad={handleImageLoad}
                  onError={reset}
                />
              )}
            </div>

            {/* Prompt preview */}
            {prompt && (
              <div className="mx-4 my-3 px-3.5 py-2.5 bg-[#151b27] border border-white/[0.05] rounded-xl">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Prompt sent to Flux AI</p>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{prompt}</p>
              </div>
            )}

            {/* Action buttons */}
            {imageUrl && (
              <div className="flex gap-2 px-4 pb-4">
                <a
                  href={imageUrl}
                  download={`${name || 'product'}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/18 py-2.5 rounded-xl transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 bg-white/5 border border-white/[0.07] hover:bg-white/8 hover:text-slate-300 py-2.5 rounded-xl transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  {copied ? 'Copied ✓' : 'Copy URL'}
                </button>
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/18 py-2.5 rounded-xl transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  New
                </button>
              </div>
            )}

          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[#0e1117] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Generations</p>
              <div className="flex gap-2 flex-wrap">
                {history.map((h, i) => (
                  <button
                    key={i}
                    title={h.name}
                    onClick={() => {/* view in lightbox or swap main image */}}
                    className="w-16 h-16 rounded-xl overflow-hidden border border-white/[0.07] hover:border-indigo-400/50 hover:scale-105 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.url} alt={h.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}