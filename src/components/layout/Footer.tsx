"use client";

import Link from "next/link";
import { Sparkles, Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative z-10 bg-slate-950 border-t border-white/5 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand Col */}
                    <div className="space-y-6 col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center space-x-2 group">
                            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Sparkles className="text-white w-4 h-4" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tighter">ANTIGRAVITY<span className="text-blue-500">.</span></span>
                        </Link>
                        <p className="text-white/40 text-sm leading-relaxed font-light">
                            Donde los desarrolladores Frontend y Backend se encuentran para resolver el mañana, un snippet a la vez.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"><Github className="w-4 h-4" /></a>
                            <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>
                            <a href="#" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"><Linkedin className="w-4 h-4" /></a>
                        </div>
                    </div>

                    {/* Links Col 1 */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest">Plataforma</h4>
                        <ul className="space-y-2">
                            <li><Link href="/questions" className="text-white/40 hover:text-blue-400 text-sm transition-colors">Preguntas y Respuestas</Link></li>
                            <li><Link href="/snippets" className="text-white/40 hover:text-blue-400 text-sm transition-colors">Explorador de Snippets</Link></li>
                            <li><Link href="/reputation" className="text-white/40 hover:text-blue-400 text-sm transition-colors">Sistema de Reputación</Link></li>
                            <li><Link href="/leaderboard" className="text-white/40 hover:text-blue-400 text-sm transition-colors">Tabla de Clasificación</Link></li>
                        </ul>
                    </div>

                    {/* Links Col 2 */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest">Recursos</h4>
                        <ul className="space-y-2">
                            <li><Link href="/docs" className="text-white/40 hover:text-purple-400 text-sm transition-colors">Documentación</Link></li>
                            <li><Link href="/api" className="text-white/40 hover:text-purple-400 text-sm transition-colors">API para Devs</Link></li>
                            <li><Link href="/blog" className="text-white/40 hover:text-purple-400 text-sm transition-colors">Blog de Ingeniería</Link></li>
                            <li><Link href="/guidelines" className="text-white/40 hover:text-purple-400 text-sm transition-colors">Guías de la Comunidad</Link></li>
                        </ul>
                    </div>

                    {/* Support Col */}
                    <div className="space-y-4">
                        <h4 className="text-white font-bold text-sm uppercase tracking-widest">Soporte</h4>
                        <ul className="space-y-2">
                            <li><Link href="/help" className="text-white/40 hover:text-white text-sm transition-colors">Centro de Ayuda</Link></li>
                            <li><Link href="/privacy" className="text-white/40 hover:text-white text-sm transition-colors">Privacidad</Link></li>
                            <li><Link href="/terms" className="text-white/40 hover:text-white text-sm transition-colors">Términos de Servicio</Link></li>
                            <li className="flex items-center space-x-2 text-white/40 text-sm pt-2">
                                <Mail className="w-4 h-4" />
                                <span>support@antigravity.dev</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/20 text-xs">
                        © 2026 ANTIGRAVITY ENGINE. Built with passion for the developer community.
                    </p>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-white/20 text-[10px] uppercase tracking-tighter">All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
