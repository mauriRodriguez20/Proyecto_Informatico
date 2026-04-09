"use client";

import { useState } from "react";
import { Mail, Lock, User, Briefcase, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface RegisterFormProps {
    onSwitch: () => void;
    onSuccess: (data: any) => void;
}

export default function RegisterForm({ onSwitch, onSuccess }: RegisterFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (res.ok) {
                onSuccess(result);
            } else {
                setError(result.error || "Ocurrió un error al registrarse.");
            }
        } catch (err) {
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl p-1">
            <div className="bg-slate-950/40 rounded-[2.2rem] p-8 md:p-10 border border-white/5">
                <div className="mb-10 text-center">
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Registro</h2>
                    <p className="text-white/40 font-light text-sm">Únete a la elite del desarrollo</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Username</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-green-500 transition-colors" />
                            <input
                                name="username"
                                type="text"
                                required
                                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all font-light"
                                placeholder="dev_pioneer"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                name="email"
                                type="email"
                                required
                                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-light"
                                placeholder="tu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all font-light"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Rol</label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-amber-500 transition-colors" />
                            <select
                                name="role"
                                required
                                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/5 transition-all font-light appearance-none"
                            >
                                <option value="" className="bg-slate-900">Selecciona tu stack</option>
                                <option value="FRONTEND" className="bg-slate-900">Frontend</option>
                                <option value="BACKEND" className="bg-slate-900">Backend</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-[10px] bg-red-400/10 p-3 rounded-xl border border-red-400/20"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 mt-6"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <span>Unirse Ahora</span>
                                <UserPlus className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-white/40 text-sm">
                        ¿Ya tienes cuenta?{" "}
                        <button
                            onClick={onSwitch}
                            className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
                        >
                            Iniciar sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
