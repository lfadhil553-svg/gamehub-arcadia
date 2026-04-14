// Format points: show ∞ for unlimited (999999999+), otherwise toLocaleString
export function formatPoints(points: number): string {
    if (points >= 999999999) return '∞';
    return points.toLocaleString();
}
