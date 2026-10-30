export const formatOrderNumber = (n: number) => `TZ-${String(n).padStart(6, "0")}`;
