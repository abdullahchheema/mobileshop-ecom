import { readJson, requireApiUser } from "@/lib/api";
import { createAddress, listAddresses } from "@/lib/addresses";
import { addressSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  return Response.json({ data: await listAddresses(userId) });
}

export async function POST(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const input = await readJson(request, addressSchema);
  if (input instanceof Response) return input;
  return Response.json({ data: await createAddress(userId, input) }, { status: 201 });
}
