import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ApiError, CurrentUser, UserRole } from "@/core/api/types";
import { getRoleLabel } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import * as authApi from "@/features/authentication/data/authApi";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import { AvatarUploadDialog } from "@/features/authentication/presentation/components/AvatarUploadDialog";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

const fieldClass =
  "w-full rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20";

const SCHOOL_CHANGE_ROLES: UserRole[] = [
  "Teacher",
  "Student",
  "CampusAdmin",
];

function userInitials(name?: string | null, username?: string | null) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

type ProfileForm = {
  fullName: string;
  mobileNumber: string;
  emailAddress: string;
  cnic: string;
};

type SchoolChangeForm = {
  schoolId: string;
  campusId: string;
};

function toProfileForm(user: CurrentUser): ProfileForm {
  return {
    fullName: user.fullName || "",
    mobileNumber: user.mobileNumber || "",
    emailAddress: user.emailAddress || "",
    cnic: user.cnic || "",
  };
}

function toSchoolChangeForm(user: CurrentUser): SchoolChangeForm {
  return {
    schoolId: user.schoolId != null ? String(user.schoolId) : "",
    campusId: user.campusId != null ? String(user.campusId) : "",
  };
}

function Notice({
  tone,
  children,
}: {
  tone: "error" | "success" | "warn";
  children: ReactNode;
}) {
  const map = {
    error: "border-red-200/80 bg-red-50 text-red-800",
    success: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200/80 bg-amber-50 text-amber-900",
  } as const;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-snug ${map[tone]}`}>
      {children}
    </div>
  );
}

function Btn({
  children,
  disabled,
  type = "submit",
  onClick,
  variant = "primary",
  block = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  variant?: "primary" | "danger" | "soft" | "ghost";
  block?: boolean;
}) {
  const styles = {
    primary:
      "bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700",
    danger:
      "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700",
    soft: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  } as const;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        styles[variant],
        block ? "w-full" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<CurrentUser | null>(user);
  const [form, setForm] = useState<ProfileForm | null>(
    user ? toProfileForm(user) : null,
  );
  const [schoolForm, setSchoolForm] = useState<SchoolChangeForm | null>(
    user ? toSchoolChangeForm(user) : null,
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [isSavingSchoolChange, setIsSavingSchoolChange] = useState(false);
  const [confirmSchoolChangeOpen, setConfirmSchoolChangeOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [schools, setSchools] = useState<authApi.RegistrationSchoolOption[]>([]);
  const [campuses, setCampuses] = useState<authApi.RegistrationCampusOption[]>(
    [],
  );
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const canRequestSchoolChange =
    !!profile && SCHOOL_CHANGE_ROLES.includes(profile.role);
  const isCampusAdminOnly = profile?.role === "CampusAdmin";
  const canDeactivateAccount = profile?.role !== "PortalAdmin";

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProfile(true);
    void authApi
      .getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        setProfile(current);
        setForm(toProfileForm(current));
        setSchoolForm(toSchoolChangeForm(current));
        updateUser(current);
      })
      .catch((caught: ApiError) => {
        if (!cancelled) {
          setProfileError(caught.message || "Unable to load profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  useEffect(() => {
    if (!canRequestSchoolChange) return;
    let cancelled = false;
    setIsLoadingSchools(true);
    void authApi
      .listRegistrationSchools()
      .then((items) => {
        if (!cancelled) setSchools(items.filter((s) => s.isActive));
      })
      .catch(() => {
        if (!cancelled) setSchools([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchools(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRequestSchoolChange]);

  useEffect(() => {
    const schoolId = schoolForm?.schoolId ? Number(schoolForm.schoolId) : NaN;
    if (!canRequestSchoolChange || !Number.isFinite(schoolId)) {
      setCampuses([]);
      return;
    }
    let cancelled = false;
    setIsLoadingCampuses(true);
    void authApi
      .listRegistrationCampuses(schoolId)
      .then((items) => {
        if (!cancelled) setCampuses(items.filter((c) => c.isActive));
      })
      .catch(() => {
        if (!cancelled) setCampuses([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCampuses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canRequestSchoolChange, schoolForm?.schoolId]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash || isLoadingProfile) return;
    if (hash === "avatar") {
      setAvatarOpen(true);
      return;
    }
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, isLoadingProfile]);

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateSchoolField<K extends keyof SchoolChangeForm>(
    key: K,
    value: SchoolChangeForm[K],
  ) {
    setSchoolForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !profile) return;
    setProfileError(null);
    setProfileSuccess(null);
    if (!form.fullName.trim()) {
      setProfileError("Display name is required.");
      return;
    }
    if (!form.mobileNumber.trim()) {
      setProfileError("Mobile number is required.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim() || null,
        cnic: form.cnic.trim() || null,
      });
      setProfile(updated);
      setForm(toProfileForm(updated));
      setSchoolForm(toSchoolChangeForm(updated));
      updateUser(updated);
      setProfileSuccess("Profile saved.");
    } catch (caught) {
      setProfileError((caught as ApiError).message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openSchoolChangeConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolForm || !profile) return;
    setSchoolError(null);
    const nextSchoolId = isCampusAdminOnly
      ? profile.schoolId
      : schoolForm.schoolId
        ? Number(schoolForm.schoolId)
        : null;
    const nextCampusId = schoolForm.campusId
      ? Number(schoolForm.campusId)
      : null;
    if (nextSchoolId === profile.schoolId && nextCampusId === profile.campusId) {
      setSchoolError("Choose a different school or campus.");
      return;
    }
    setConfirmSchoolChangeOpen(true);
  }

  async function confirmSchoolChangeRequest() {
    if (!schoolForm || !profile) return;
    setSchoolError(null);
    setIsSavingSchoolChange(true);
    try {
      const result = await authApi.requestSchoolChange({
        schoolId: isCampusAdminOnly
          ? profile.schoolId
          : schoolForm.schoolId
            ? Number(schoolForm.schoolId)
            : null,
        campusId: schoolForm.campusId ? Number(schoolForm.campusId) : null,
      });
      setConfirmSchoolChangeOpen(false);
      await logout();
      navigate("/account-locked", {
        replace: true,
        state: { message: result.message },
      });
    } catch (caught) {
      setSchoolError(
        (caught as ApiError).message ||
          "Unable to submit school/campus change request.",
      );
      setConfirmSchoolChangeOpen(false);
    } finally {
      setIsSavingSchoolChange(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Password and confirmation do not match.");
      return;
    }
    setIsSubmittingPassword(true);
    try {
      const updated = await authApi.changePassword({
        currentPassword: currentPassword || null,
        newPassword,
      });
      updateUser({ ...updated, mustChangePassword: false });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated.");
    } catch (caught) {
      setPasswordError((caught as ApiError).message || "Unable to change password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  async function handleDeactivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeactivateError(null);
    if (!deactivateConfirm) {
      setDeactivateError("Confirm deactivation first.");
      return;
    }
    if (!deactivatePassword.trim()) {
      setDeactivateError("Enter your current password.");
      return;
    }
    setIsDeactivating(true);
    try {
      await authApi.deactivateAccount({ currentPassword: deactivatePassword });
      await logout();
      navigate("/login", { replace: true });
    } catch (caught) {
      setDeactivateError(
        (caught as ApiError).message || "Unable to deactivate account.",
      );
    } finally {
      setIsDeactivating(false);
    }
  }

  if (!user || !form || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-slate-500">
          {isLoadingProfile ? "Loading profile…" : "Unable to load profile."}
        </p>
      </div>
    );
  }

  const initials = userInitials(
    form.fullName || profile.fullName,
    profile.username,
  );
  const avatarUrl = resolvePublicUrl(profile.avatarUrl);
  const schoolLabel =
    schools.find((s) => String(s.id) === String(profile.schoolId))?.name ??
    (profile.schoolId != null ? `School ${profile.schoolId}` : null);
  const campusLabel =
    campuses.find((c) => String(c.id) === String(profile.campusId))?.name ??
    (profile.campusId != null ? `Campus ${profile.campusId}` : null);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f6fb]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-90"
        style={{
          background:
            "radial-gradient(90% 70% at 12% 0%, rgba(29,106,245,0.18), transparent 55%), radial-gradient(70% 50% at 88% 8%, rgba(51,137,255,0.14), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-6">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
          {/* ── LEFT ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(20,39,87,0.06)]">
            {/* Identity */}
            <div
              className="relative px-5 py-5 sm:px-6"
              style={{
                background:
                  "linear-gradient(125deg, #142757 0%, #1845b6 48%, #1d6af5 100%)",
              }}
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, #fff 0.7px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="relative flex items-center gap-4">
                <button
                  type="button"
                  id="avatar"
                  onClick={() => setAvatarOpen(true)}
                  className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/15 text-lg font-bold text-white ring-2 ring-white/35 outline-none transition hover:ring-amber-300/70 focus-visible:ring-amber-300"
                  aria-label="Change photo"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {initials}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
                    Edit
                  </span>
                </button>
                <div className="min-w-0 flex-1 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/80">
                    Account
                  </p>
                  <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                    {form.fullName || profile.username}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sky-50/90">
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-medium text-white">
                      {getRoleLabel(profile.role)}
                    </span>
                    <span className="truncate opacity-90">@{profile.username}</span>
                    {schoolLabel ? (
                      <span className="truncate opacity-80">
                        {schoolLabel}
                        {campusLabel ? ` · ${campusLabel}` : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Btn
                  type="button"
                  variant="soft"
                  onClick={() => setAvatarOpen(true)}
                >
                  <span className="hidden sm:inline">Update photo</span>
                  <span className="sm:hidden">Photo</span>
                </Btn>
              </div>
            </div>

            {/* Profile form */}
            <div id="profile" className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Personal details
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Name and contact — school changes are separate below.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {profileError ? <Notice tone="error">{profileError}</Notice> : null}
                {profileSuccess ? (
                  <Notice tone="success">{profileSuccess}</Notice>
                ) : null}

                <form
                  className="space-y-3"
                  onSubmit={(e) => void handleProfileSubmit(e)}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="fullName" required>
                        Display name
                      </FieldLabel>
                      <input
                        id="fullName"
                        type="text"
                        required
                        value={form.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="mobileNumber" required>
                        Mobile
                      </FieldLabel>
                      <input
                        id="mobileNumber"
                        type="tel"
                        required
                        value={form.mobileNumber}
                        onChange={(e) =>
                          updateField("mobileNumber", e.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="emailAddress">Email</FieldLabel>
                      <input
                        id="emailAddress"
                        type="email"
                        value={form.emailAddress}
                        onChange={(e) =>
                          updateField("emailAddress", e.target.value)
                        }
                        className={fieldClass}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor="cnic">CNIC</FieldLabel>
                      <input
                        id="cnic"
                        type="text"
                        value={form.cnic}
                        onChange={(e) => updateField("cnic", e.target.value)}
                        className={fieldClass}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Btn disabled={isSavingProfile || isLoadingProfile}>
                      {isSavingProfile ? "Saving…" : "Save profile"}
                    </Btn>
                  </div>
                </form>
              </div>
            </div>

            {/* School change */}
            {canRequestSchoolChange && schoolForm ? (
              <div id="school-campus" className="px-5 py-5 sm:px-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      School / campus
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {isCampusAdminOnly
                        ? "Campus only — confirming locks your login for admin review."
                        : "Own request button — confirming locks your login for admin review."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {profile.pendingSchoolChange ? (
                    <Notice tone="warn">
                      Pending change → school{" "}
                      {profile.pendingSchoolChange.toSchoolId ?? "—"} / campus{" "}
                      {profile.pendingSchoolChange.toCampusId ?? "—"} (
                      {profile.pendingSchoolChange.status})
                    </Notice>
                  ) : null}
                  {schoolError ? <Notice tone="error">{schoolError}</Notice> : null}

                  <form
                    className="space-y-3"
                    onSubmit={(e) => openSchoolChangeConfirm(e)}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="schoolId">School</FieldLabel>
                        <SearchableSelect
                          id="schoolId"
                          disabled={
                            isSavingSchoolChange ||
                            isLoadingSchools ||
                            isCampusAdminOnly
                          }
                          value={schoolForm.schoolId}
                          allowEmpty
                          emptyLabel={
                            isLoadingSchools ? "Loading…" : "Select school"
                          }
                          placeholder={
                            isLoadingSchools ? "Loading…" : "Select school"
                          }
                          options={schools.map((school) => ({
                            value: String(school.id),
                            label: school.name,
                          }))}
                          onChange={(next) => {
                            updateSchoolField("schoolId", next);
                            updateSchoolField("campusId", "");
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="campusId">Campus</FieldLabel>
                        <SearchableSelect
                          id="campusId"
                          disabled={
                            isSavingSchoolChange ||
                            !schoolForm.schoolId ||
                            isLoadingCampuses
                          }
                          value={schoolForm.campusId}
                          allowEmpty
                          emptyLabel={
                            !schoolForm.schoolId
                              ? "School first"
                              : isLoadingCampuses
                                ? "Loading…"
                                : "Select campus"
                          }
                          placeholder={
                            !schoolForm.schoolId
                              ? "School first"
                              : isLoadingCampuses
                                ? "Loading…"
                                : "Select campus"
                          }
                          options={campuses.map((campus) => ({
                            value: String(campus.id),
                            label: campus.name,
                          }))}
                          onChange={(next) => updateSchoolField("campusId", next)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Btn disabled={isSavingSchoolChange || isLoadingProfile}>
                        {isSavingSchoolChange ? "Submitting…" : "Request change"}
                      </Btn>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── RIGHT (narrower) ── */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-[4.75rem]">
            <div
              id="password"
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(20,39,87,0.06)]"
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Security
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Password & account access
                </p>
              </div>
              <div className="space-y-3 px-4 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Change password
                </h3>
                {passwordError ? (
                  <Notice tone="error">{passwordError}</Notice>
                ) : null}
                {passwordSuccess ? (
                  <Notice tone="success">{passwordSuccess}</Notice>
                ) : null}
                <form
                  className="space-y-2.5"
                  onSubmit={(e) => void handlePasswordSubmit(e)}
                >
                  <div>
                    <FieldLabel htmlFor="currentPassword" required>
                      Current
                    </FieldLabel>
                    <input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="newPassword" required>
                      New
                    </FieldLabel>
                    <input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="confirmPassword" required>
                      Confirm
                    </FieldLabel>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <Btn block disabled={isSubmittingPassword}>
                    {isSubmittingPassword ? "Updating…" : "Update password"}
                  </Btn>
                </form>
              </div>
            </div>

            {canDeactivateAccount ? (
              <div
                id="deactivate"
                className="overflow-hidden rounded-2xl border border-red-200/70 bg-white shadow-[0_8px_30px_rgba(127,29,29,0.05)]"
              >
                <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-4 py-3">
                  <h2 className="text-sm font-semibold text-red-700">
                    Danger zone
                  </h2>
                  <p className="mt-0.5 text-xs text-red-600/80">
                    Deactivate disables login until an admin restores it.
                  </p>
                </div>
                <div className="space-y-3 px-4 py-4">
                  {deactivateError ? (
                    <Notice tone="error">{deactivateError}</Notice>
                  ) : null}
                  <form
                    className="space-y-2.5"
                    onSubmit={(e) => void handleDeactivate(e)}
                  >
                    <div>
                      <FieldLabel htmlFor="deactivatePassword" required>
                        Current password
                      </FieldLabel>
                      <input
                        id="deactivatePassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={deactivatePassword}
                        onChange={(e) => setDeactivatePassword(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <label className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2.5 text-xs leading-snug text-slate-700">
                      <input
                        type="checkbox"
                        checked={deactivateConfirm}
                        onChange={(e) => setDeactivateConfirm(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                      <span>
                        I understand I will be signed out immediately.
                      </span>
                    </label>
                    <Btn
                      variant="danger"
                      block
                      disabled={isDeactivating || !deactivateConfirm}
                    >
                      {isDeactivating ? "Deactivating…" : "Deactivate account"}
                    </Btn>
                  </form>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {confirmSchoolChangeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-change-confirm-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div
              className="px-5 py-4 text-white"
              style={{
                background:
                  "linear-gradient(125deg, #142757 0%, #1845b6 55%, #1d6af5 100%)",
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                Confirmation
              </p>
              <h3
                id="school-change-confirm-title"
                className="mt-1 text-lg font-semibold"
              >
                Lock account for school change?
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Your account will lock until an admin for the destination school
                or campus approves or rejects this request. You will be signed
                out now.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Btn
                  type="button"
                  variant="soft"
                  disabled={isSavingSchoolChange}
                  onClick={() => setConfirmSchoolChangeOpen(false)}
                >
                  Cancel
                </Btn>
                <Btn
                  type="button"
                  disabled={isSavingSchoolChange}
                  onClick={() => void confirmSchoolChangeRequest()}
                >
                  {isSavingSchoolChange ? "Submitting…" : "Confirm & lock"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {avatarOpen ? (
        <AvatarUploadDialog
          user={profile}
          onClose={() => setAvatarOpen(false)}
          onUploaded={(updated) => {
            setProfile(updated);
            updateUser(updated);
          }}
        />
      ) : null}
    </div>
  );
}
