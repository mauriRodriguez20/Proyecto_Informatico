"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950"
        >
            <div className="relative flex flex-col items-center">
                {/* Animated Orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="h-24 w-24 rounded-full border-t-4 border-blue-500 border-r-4 border-transparent"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [360, 180, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute h-24 w-24 rounded-full border-b-4 border-purple-500 border-l-4 border-transparent"
                />

                {/* Glow effect */}
                <div className="absolute h-32 w-32 bg-blue-500/20 blur-3xl rounded-full" />

                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-xl font-bold tracking-widest text-white uppercase"
                >
                    Cargando...
                </motion.h2>
            </div>
        </motion.div>
    );
}
