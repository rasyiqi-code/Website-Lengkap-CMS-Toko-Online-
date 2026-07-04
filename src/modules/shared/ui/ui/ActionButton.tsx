"use client";


export function ActionButton({ 
    children,
    onClick, 
    title, 
    variant = "default",
    className = "",
    disabled = false
}: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    title?: string;
    variant?: "default" | "danger";
    className?: string;
    disabled?: boolean;
}) {
    const variantClass = variant === "danger" ? "hover:text-red-500" : "hover:text-white";
    const ariaLabel = title || (typeof children === "string" ? children : undefined);
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                    onClick?.();
                }
            }}
            disabled={disabled}
            className={`p-1 text-foreground transition-all outline-none rounded focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 disabled:opacity-40 disabled:pointer-events-none ${variantClass} ${className}`}
            title={title}
            aria-label={ariaLabel}
            aria-disabled={disabled ? "true" : undefined}
        >
            {children}
        </button>
    );
}
