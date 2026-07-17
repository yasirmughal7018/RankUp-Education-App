import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ApiError, CurrentUser, UserRole } from "@/core/api/types";
import { getRoleLabel } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import * as authApi from "@/features/authentication/data/authApi";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import { AvatarUploadDialog } from "@/features/authentication/presentation/components/AvatarUploadDialog";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";

const inputClassName =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-500 focus:border-brand-500 focus:ring-2";

const sectionClassName =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

const SCHOOL_CHANGE_ROLES: UserRole[] = [
  "Teacher",
  "Student",
  "Parent",
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

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProfile(true);
    void authApi
      .getCurrentUser()
      .then((current) => {
        if (cancelled) {
          return;
        }
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
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  useEffect(() => {
    if (!canRequestSchoolChange) {
      return;
    }

    let cancelled = false;
    setIsLoadingSchools(true);
    void authApi
      .listRegistrationSchools()
      .then((items) => {
        if (!cancelled) {
          setSchools(items.filter((school) => school.isActive));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSchools([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSchools(false);
        }
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
        if (!cancelled) {
          setCampuses(items.filter((campus) => campus.isActive));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampuses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCampuses(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canRequestSchoolChange, schoolForm?.schoolId]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash || isLoadingProfile) {
      return;
    }
    if (hash === "avatar") {
      setAvatarOpen(true);
      return;
    }
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, isLoadingProfile]);

  function updateField<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
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
    if (!form || !profile) {
      return;
    }

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
      setProfileSuccess("Profile updated successfully.");
    } catch (caught) {
      const apiError = caught as ApiError;
      setProfileError(apiError.message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openSchoolChangeConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolForm || !profile) {
      return;
    }

    setSchoolError(null);

    const nextSchoolId = isCampusAdminOnly
      ? profile.schoolId
      : schoolForm.schoolId
        ? Number(schoolForm.schoolId)
        : null;
    const nextCampusId = schoolForm.campusId
      ? Number(schoolForm.campusId)
      : null;

    if (
      nextSchoolId === profile.schoolId &&
      nextCampusId === profile.campusId
    ) {
      setSchoolError("Choose a different school or campus before requesting.");
      return;
    }

    setConfirmSchoolChangeOpen(true);
  }

  async function confirmSchoolChangeRequest() {
    if (!schoolForm || !profile) {
      return;
    }

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
      const apiError = caught as ApiError;
      setSchoolError(
        apiError.message || "Unable to submit school/campus change request.",
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
      setPasswordSuccess("Password updated successfully.");
    } catch (caught) {
      const apiError = caught as ApiError;
      setPasswordError(apiError.message || "Unable to change password.");
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  async function handleDeactivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeactivateError(null);

    if (!deactivateConfirm) {
      setDeactivateError("Confirm that you want to deactivate this account.");
      return;
    }

    if (!deactivatePassword.trim()) {
      setDeactivateError("Enter your current password to deactivate.");
      return;
    }

    setIsDeactivating(true);
    try {
      await authApi.deactivateAccount({
        currentPassword: deactivatePassword,
      });
      await logout();
      navigate("/login", { replace: true });
    } catch (caught) {
      const apiError = caught as ApiError;
      setDeactivateError(apiError.message || "Unable to deactivate account.");
    } finally {
      setIsDeactivating(false);
    }
  }

  if (!user || !form || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader title="Profile" description="Manage your account details." />
        <p className="text-sm text-slate-600">
          {isLoadingProfile ? "Loading profile..." : "Unable to load profile."}
        </p>
      </div>
    );
  }

  const initials = userInitials(form.fullName || profile.fullName, profile.username);
  const avatarUrl = resolvePublicUrl(profile.avatarUrl);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Profile"
        description="Update your display name, contact details, and security settings."
      />

      <section className={sectionClassName}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            id="avatar"
            onClick={() => setAvatarOpen(true)}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700 outline-none ring-brand-500 focus-visible:ring-2"
            aria-label="Upload avatar"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            <span className="absolute inset-x-0 bottom-0 bg-slate-900/55 py-1 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Upload
            </span>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">
              {form.fullName || profile.username}
            </h2>
            <p className="text-sm text-slate-500">@{profile.username}</p>
            <p className="mt-1 text-sm font-medium text-brand-700">
              {getRoleLabel(profile.role)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Click the avatar to upload a profile picture.
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClassName} id="profile">
        <h2 className="text-base font-semibold text-slate-900">
          Profile details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Update your display name and contact details.
        </p>

        {profileError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div>
        ) : null}
        {profileSuccess ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {profileSuccess}
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={(e) => void handleProfileSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="fullName" required>
                Display name
              </FieldLabel>
              <input
                id="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel htmlFor="mobileNumber" required>
                Mobile number
              </FieldLabel>
              <input
                id="mobileNumber"
                type="tel"
                required
                value={form.mobileNumber}
                onChange={(event) =>
                  updateField("mobileNumber", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <FieldLabel htmlFor="emailAddress">Email address</FieldLabel>
              <input
                id="emailAddress"
                type="email"
                value={form.emailAddress}
                onChange={(event) =>
                  updateField("emailAddress", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="cnic">CNIC</FieldLabel>
              <input
                id="cnic"
                type="text"
                value={form.cnic}
                onChange={(event) => updateField("cnic", event.target.value)}
                className={inputClassName}
                placeholder="Optional"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile || isLoadingProfile}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      {canRequestSchoolChange && schoolForm ? (
        <section className={sectionClassName} id="school-campus">
          <h2 className="text-base font-semibold text-slate-900">
            School / campus change
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Submit a separate request to change school or campus. After you
            confirm, your account locks until School Admin or Portal Admin
            reviews it.
            {isCampusAdminOnly
              ? " Campus admins can change campus only."
              : null}
          </p>

          {profile.pendingSchoolChange ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              You already have a pending change to school{" "}
              {profile.pendingSchoolChange.toSchoolId ?? "—"} / campus{" "}
              {profile.pendingSchoolChange.toCampusId ?? "—"} (
              {profile.pendingSchoolChange.status}).
            </p>
          ) : null}

          {schoolError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {schoolError}
            </div>
          ) : null}

          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => openSchoolChangeConfirm(e)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
                    isLoadingSchools ? "Loading schools..." : "Select school"
                  }
                  placeholder={
                    isLoadingSchools ? "Loading schools..." : "Select school"
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
                      ? "Select a school first"
                      : isLoadingCampuses
                        ? "Loading campuses..."
                        : "Select campus"
                  }
                  placeholder={
                    !schoolForm.schoolId
                      ? "Select a school first"
                      : isLoadingCampuses
                        ? "Loading campuses..."
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

            <button
              type="submit"
              disabled={isSavingSchoolChange || isLoadingProfile}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {isSavingSchoolChange
                ? "Submitting..."
                : "Request school / campus change"}
            </button>
          </form>
        </section>
      ) : null}

      <section className={sectionClassName} id="password">
        <h2 className="text-base font-semibold text-slate-900">
          Change password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a new password for your RankUp Education account.
        </p>

        {passwordError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {passwordError}
          </div>
        ) : null}
        {passwordSuccess ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordSuccess}
          </div>
        ) : null}

        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => void handlePasswordSubmit(e)}
        >
          <div>
            <FieldLabel htmlFor="currentPassword" required>
              Current password
            </FieldLabel>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="newPassword" required>
              New password
            </FieldLabel>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="confirmPassword" required>
              Confirm new password
            </FieldLabel>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmittingPassword}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {isSubmittingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>

      <section
        className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm"
        id="deactivate"
      >
        <h2 className="text-base font-semibold text-red-700">
          Deactivate account
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Deactivating disables your login. An administrator may need to restore
          access later.
        </p>

        {deactivateError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deactivateError}
          </div>
        ) : null}

        <form
          className="mt-4 space-y-4"
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
              onChange={(event) => setDeactivatePassword(event.target.value)}
              className={inputClassName}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={deactivateConfirm}
              onChange={(event) => setDeactivateConfirm(event.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span>
              I understand that my account will be deactivated and I will be
              signed out.
            </span>
          </label>
          <button
            type="submit"
            disabled={isDeactivating || !deactivateConfirm}
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-70"
          >
            {isDeactivating ? "Deactivating..." : "Deactivate account"}
          </button>
        </form>
      </section>

      {confirmSchoolChangeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="school-change-confirm-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3
              id="school-change-confirm-title"
              className="text-lg font-semibold text-slate-900"
            >
              Confirm school / campus change
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              After you confirm, your account will be locked automatically until
              School Admin or Portal Admin approves or rejects this request. You
              will be signed out now.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSavingSchoolChange}
                onClick={() => setConfirmSchoolChangeOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSchoolChange}
                onClick={() => void confirmSchoolChangeRequest()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {isSavingSchoolChange ? "Submitting..." : "Confirm and lock"}
              </button>
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
