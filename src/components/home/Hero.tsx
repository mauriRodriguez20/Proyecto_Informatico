"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Code2, Rocket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Hero() {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-slate-950">
            {/* Volumetric Background Decor */}
            <div className="absolute inset-0 z-0">
                {/* Animated Beams */}
                <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/50 to-transparent animate-pulse opacity-20" />
                <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-purple-500/50 to-transparent animate-pulse opacity-20 delay-700" />

                {/* Radial Gradients for Depth */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-t from-slate-950 via-blue-900/10 to-transparent pointer-events-none" />

                {/* Grid Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>

            <main className="relative z-10 container mx-auto px-6 text-center pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center space-y-8"
                >
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-[0.2em] shadow-2xl backdrop-blur-xl">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span>Nuevos Snippets cada semana</span>
                    </div>

                    {/* Main Title with Volume */}
                    <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-black text-white leading-[0.9] tracking-tighter drop-shadow-2xl">
                        Construye el <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 italic">Futuro</span> hoy.
                    </h1>

                    {/* Subtext Centered & Narrower for readability */}
                    <p className="max-w-2xl text-lg md:text-xl text-white/40 font-light leading-relaxed">
                        La plataforma definitiva para desarrolladores que buscan soluciones elegantes,
                        snippets de alto rendimiento y una comunidad que impulsa tu carrera al siguiente nivel.
                    </p>

                    {/* Action Buttons with Dynamic Shapes */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pt-8 w-full sm:w-auto">
                        <Link
                            href="/register"
                            className="group relative px-10 py-5 bg-white text-slate-950 font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative flex items-center gap-2">
                                <span>Comenzar Ahora</span>
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>

                        <Link
                            href="/questions"
                            className="group px-10 py-5 bg-slate-900/50 backdrop-blur-xl border border-white/10 text-white font-black rounded-2xl flex items-center gap-3 transition-all hover:bg-slate-900 hover:border-white/20 active:scale-95"
                        >
                            <Code2 className="w-5 h-5 text-blue-400" />
                            <span>Explorar Snippets</span>
                        </Link>
                    </div>
                </motion.div>

                {/* Visual Element: Floating Cards / Abstract volume */}
                <div className="mt-32 relative hidden md:block">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 1 }}
                        className="relative mx-auto max-w-4xl aspect-video rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-3xl shadow-[0_0_100px_rgba(59,130,246,0.1)] overflow-hidden"
                    >
                        {/* Fake UI code editor */}
                        <div className="absolute inset-0 p-8 flex flex-col">
                            <div className="flex items-center space-x-2 mb-6">
                                <div className="w-3 h-3 rounded-full bg-red-400/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                                <div className="w-3 h-3 rounded-full bg-green-400/50" />
                            </div>
                            <div className="flex-grow font-mono text-sm space-y-2 opacity-30 select-none">
                                <div className="h-4 w-3/4 bg-white/10 rounded" />
                                <div className="h-4 w-1/2 bg-white/10 rounded" />
                                <div className="h-4 w-5/6 bg-white/10 rounded" />
                                <div className="h-4 w-2/3 bg-white/10 rounded" />
                                <div className="h-4 w-3/4 bg-white/10 rounded" />
                            </div>
                        </div>

                        {/* Floating Highlight Beam in UI */}
                        <motion.div
                            animate={{ x: [-500, 1000] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute top-0 w-40 h-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent -skew-x-12"
                        />
                    </motion.div>

                    {/* Decorative floating icons */}
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute -top-10 -right-10 p-6 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-600/20"
                    >
                        <Rocket className="w-10 h-10 text-white" />
                    </motion.div>
                </div>
            </main>

            {/* Background Volumetric "Shape" at bottom */}
            <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-[2/1] bg-blue-500/10 blur-[120px] rounded-[100%] pointer-events-none" />
        </div>
    );
}
