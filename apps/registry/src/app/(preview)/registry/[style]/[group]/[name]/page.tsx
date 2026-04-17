import { getRegistryPreviewByPath } from "@registry/lib";
import { getRegistryPreviewLoaderByKey } from "@registry/preview-registry";
import { notFound } from "next/navigation";
import RegistryPreviewView from "@/components/registry-preview-view";

export default async function RegistryPreviewPage({
  params,
}: {
  params: Promise<{ style: string; group: string; name: string }>;
}) {
  const { style, group, name } = await params;
  const previewKey = `${style}/${group}/${name}`;

  const entry = getRegistryPreviewByPath(style, group, name);
  const loader = getRegistryPreviewLoaderByKey(previewKey);

  if (!(entry && loader)) {
    notFound();
  }

  return <RegistryPreviewView previewKey={previewKey} />;
}
