"use client";

import type { CatalogueItemImage } from "@catering/shared-types";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

interface CatalogueImageGalleryProps {
  itemId: string;
  images: CatalogueItemImage[];
  onImagesChange: () => void;
}

export function formatImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3001";
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function uploadDishImage(
  itemId: string,
  dto: { fileBase64: string; filename: string; caption?: string | undefined; isPrimary?: boolean | undefined },
  token: string,
): Promise<CatalogueItemImage> {
  return apiFetch(`/catalogue-items/${itemId}/images/upload`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

async function addDishImageUrl(
  itemId: string,
  dto: { url: string; caption?: string | undefined; isPrimary?: boolean | undefined },
  token: string,
): Promise<CatalogueItemImage> {
  return apiFetch(`/catalogue-items/${itemId}/images`, {
    method: "POST",
    body: JSON.stringify(dto),
    token,
  });
}

async function deleteDishImage(
  itemId: string,
  imageId: string,
  token: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/catalogue-items/${itemId}/images/${imageId}`, {
    method: "DELETE",
    token,
  });
}

async function setPrimaryDishImage(
  itemId: string,
  imageId: string,
  token: string,
): Promise<CatalogueItemImage> {
  return apiFetch(`/catalogue-items/${itemId}/images/${imageId}/primary`, {
    method: "PATCH",
    token,
  });
}

export function CatalogueImageGallery({
  itemId,
  images,
  onImagesChange,
}: CatalogueImageGalleryProps) {
  const { accessToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !accessToken) return;

    setIsUploading(true);
    setErrorMessage(null);

    const fileList = Array.from(files);
    let successCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]!;
      setUploadProgress(`Uploading ${i + 1} of ${fileList.length}: ${file.name}...`);

      try {
        const base64 = await readFileAsBase64(file);
        await uploadDishImage(
          itemId,
          {
            fileBase64: base64,
            filename: file.name,
            isPrimary: images.length === 0 && i === 0,
          },
          accessToken,
        );
        successCount++;
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? `Failed on ${file.name}: ${err.message}`
            : `Failed to upload ${file.name}`,
        );
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    e.target.value = "";

    if (successCount > 0) {
      onImagesChange();
    }
  };

  const handleAddViaUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !accessToken) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      await addDishImageUrl(
        itemId,
        {
          url: urlInput.trim(),
          caption: captionInput.trim() || undefined,
          isPrimary: images.length === 0,
        },
        accessToken,
      );
      setUrlInput("");
      setCaptionInput("");
      setShowUrlModal(false);
      onImagesChange();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to add image via URL",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!accessToken) return;
    try {
      await setPrimaryDishImage(itemId, imageId, accessToken);
      onImagesChange();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to set primary cover photo",
      );
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!accessToken) return;
    if (!window.confirm("Are you sure you want to remove this dish photo?")) return;

    try {
      await deleteDishImage(itemId, imageId, accessToken);
      onImagesChange();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete photo",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
            Dish Photos ({images.length})
          </h4>
          <p className="text-[11px] text-[#737373]">
            Upload multiple photos of this dish. The primary photo is displayed in proposals and menus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlModal(!showUrlModal)}
            className="rounded border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
          >
            Add by URL
          </button>
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded bg-[#171717] px-3 py-1 text-xs font-medium text-white hover:bg-[#262626] transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload Photos</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Progress & Error Banners */}
      {uploadProgress && (
        <div className="flex items-center gap-2 rounded border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-xs text-[#171717]">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#171717] border-t-transparent" />
          <span>{uploadProgress}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded border border-[#EF4444] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          {errorMessage}
        </div>
      )}

      {/* Optional URL Modal / Inline Form */}
      {showUrlModal && (
        <form
          onSubmit={handleAddViaUrl}
          className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3"
        >
          <div className="text-xs font-semibold text-[#171717]">
            Add Image from Web URL
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1">
                Image URL <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/dish.jpg"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#737373] mb-1">
                Caption / Angle (optional)
              </label>
              <input
                type="text"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="e.g. Plated presentation"
                className="w-full rounded border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#171717] focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUrlModal(false)}
              className="rounded border border-[#E5E5E5] bg-white px-3 py-1 text-xs text-[#737373] hover:bg-[#F5F5F4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !urlInput.trim()}
              className="rounded bg-[#171717] px-3 py-1 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
            >
              Add Photo
            </button>
          </div>
        </form>
      )}

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[#E5E5E5] p-8 text-center bg-white">
          <svg
            className="mx-auto h-8 w-8 text-[#A3A3A3]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-xs font-medium text-[#171717]">
            No photos uploaded for this dish
          </p>
          <p className="mt-1 text-[11px] text-[#737373]">
            Upload plating photos or buffet presentations to enhance your customer proposals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => {
            const formatted = formatImageUrl(img.url);
            return (
              <div
                key={img.id}
                className="group relative rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden flex flex-col transition-all hover:border-[#171717]"
              >
                {/* Image Container */}
                <div
                  className="aspect-square w-full overflow-hidden bg-[#F0F0F0] cursor-pointer"
                  onClick={() => setActivePreviewImage(formatted)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formatted}
                    alt={img.caption || "Dish photo"}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Primary Badge */}
                {img.isPrimary && (
                  <span className="absolute top-2 left-2 rounded bg-[#171717] px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                    Primary Cover
                  </span>
                )}

                {/* Card Footer / Quick Actions */}
                <div className="p-2 flex items-center justify-between text-xs bg-white border-t border-[#E5E5E5]">
                  <div className="truncate text-[11px] text-[#737373]">
                    {img.caption || (img.isPrimary ? "Cover photo" : "Dish angle")}
                  </div>
                  <div className="flex items-center gap-1">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        title="Set as Cover Photo"
                        onClick={() => handleSetPrimary(img.id)}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F4]"
                      >
                        Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete Photo"
                      onClick={() => handleDeleteImage(img.id)}
                      className="rounded p-1 text-[#737373] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {activePreviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setActivePreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePreviewImage}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setActivePreviewImage(null)}
              className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#171717] shadow-lg hover:bg-[#F5F5F4]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
