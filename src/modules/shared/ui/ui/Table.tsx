"use client";

import React from "react";

export function TableContainer({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-card md:rounded-md border-y md:border border-border/50 overflow-hidden shadow-xl relative -mx-3 md:mx-0 w-[calc(100%+1.5rem)] md:w-full ${className}`}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/20"></div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/50">
                    {children}
                </table>
            </div>
        </div>
    );
}

export function THead({ children }: { children?: React.ReactNode }) {
    return <thead className="bg-muted/20">{children}</thead>;
}

export function TBody({ children }: { children?: React.ReactNode }) {
    return <tbody className="divide-y divide-border/50">{children}</tbody>;
}

export function TR({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
    return <tr className={`hover:bg-muted/5 transition-all group ${className}`}>{children}</tr>;
}

export function TH({ 
    children, 
    align = "left",
    className = ""
}: { 
    children?: React.ReactNode; 
    align?: "left" | "center" | "right";
    className?: string;
}) {
    const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
    return (
        <th className={`px-3 md:px-5 py-2.5 ${alignClass} text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 ${className}`}>
            {children}
        </th>
    );
}

export function TD({ 
    children, 
    align = "left",
    className = "",
    colSpan,
    noWrap = true
}: { 
    children?: React.ReactNode; 
    align?: "left" | "center" | "right";
    className?: string;
    colSpan?: number;
    noWrap?: boolean;
}) {
    const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
    return (
        <td colSpan={colSpan} className={`px-3 md:px-5 py-1.5 ${noWrap ? 'whitespace-nowrap' : 'break-words whitespace-normal'} ${alignClass} text-foreground ${className}`}>
            {children}
        </td>
    );
}
