"use client";
import React from "react";
import { FloatingNav } from "../ui/FloatingNavbar";
import { IconHome, IconMessage, IconUser } from "@tabler/icons-react";

export function Navbar() {
    const navItems = [
        {
            name: "Home",
            link: "/",
            icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" />,
        },
        {
            name: "Snippets",
            link: "/snippets",
            icon: <IconUser className="h-4 w-4 text-neutral-500 dark:text-white" />,
        },
        {
            name: "Q&A",
            link: "/questions",
            icon: (
                <IconMessage className="h-4 w-4 text-neutral-500 dark:text-white" />
            ),
        },
    ];
    return (
        <div className="relative w-full">
            <FloatingNav navItems={navItems} />
        </div>
    );
}
