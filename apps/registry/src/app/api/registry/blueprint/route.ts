import { listRegistryBlueprintImages } from "@/lib/registry-blueprint";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style") ?? "";
  const group = searchParams.get("group") ?? "";
  const name = searchParams.get("name") ?? "";
  const variant = searchParams.get("variant");

  const images = await listRegistryBlueprintImages(style, group, name, variant);

  return Response.json({ images });
}
