export const apiError = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });
