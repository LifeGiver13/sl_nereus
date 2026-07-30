import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";
import { unknown } from "zod"



export type PlatformInfo = {
    ios: unknown[] | null;
    android: unknown[] | null;
}

interface PlatfromBadgesProps {
    platform?: PlatformInfo;
    className?: string;
    size?: 'sm' | 'md';
    showLabel?: boolean;
}

const PlatformBadges: React.FC<PlatfromBadgesProps> = ({
    platform,
    className,
    size = 'sm',
    showLabel = false
}) => {
    const hasIos = Array.isArray(platform?.ios) && platform?.ios.length > 0;
    const hasAndroid = Array.isArray(platform?.android) && platform?.android.length > 0;

    if (!hasIos && !hasAndroid) {
        return (
            <span className={cn('text-xs text-muted-foreground', className)}>
                —
            </span>
        );
    };

    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const badgeBase = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium';


    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {hasIos && (
                <span
                    className={cn(
                        badgeBase,
                        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    )}
                    title="iOS app installed"
                >
                    <span className={cn('font-semibold leading-none', size === 'sm' ? 'text-[11px]' : 'text-xs')}>
                        <svg
                            className={iconSize}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                    </span>
                    {showLabel && <span>iOS</span>}
                </span>
            )}

            {hasAndroid && (
                <span
                    className={cn(
                        badgeBase,
                        'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                    )}
                    title="Android app installed"
                >
                    <Smartphone className={iconSize} />
                    {showLabel && <span>Android</span>}
                </span>
            )}
        </div>
    );
};

export default PlatformBadges;