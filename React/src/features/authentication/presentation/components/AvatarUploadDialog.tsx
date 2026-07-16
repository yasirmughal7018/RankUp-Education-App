import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ApiError, CurrentUser } from "@/core/api/types";
import * as authApi from "@/features/authentication/data/authApi";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";

interface AvatarUploadDialogProps {
  user: CurrentUser;
  onClose: () => void;
  onUploaded: (user: CurrentUser) => void;
}

export function AvatarUploadDialog({
  user,
  onClose,
  onUploaded,
}: AvatarUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    resolvePublicUrl(user.avatarUrl),
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleFileChange(selected: File | null) {
    setError(null);
    setFile(selected);
    if (!selected) {
      setPreview(resolvePublicUrl(user.avatarUrl));
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setFile(null);
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      setFile(null);
      return;
    }

    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose an image to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await authApi.uploadAvatar(file);
      onUploaded(updated);
      onClose();
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "Unable to upload avatar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-upload-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2
          id="avatar-upload-title"
          className="text-lg font-semibold text-slate-900"
        >
          Update avatar
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a square photo for your profile menu.
        </p>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-3xl font-bold text-brand-700 outline-none ring-brand-500 focus-visible:ring-2"
          >
            {preview ? (
              <img
                src={preview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (user.fullName || user.username).slice(0, 2).toUpperCase()
            )}
            <span className="absolute inset-x-0 bottom-0 bg-slate-900/55 py-1 text-center text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Choose
            </span>
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) =>
            handleFileChange(event.target.files?.[0] ?? null)
          }
        />

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="mt-6 flex justify-end gap-2" onSubmit={(e) => void handleSubmit(e)}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !file}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {isSubmitting ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
}
