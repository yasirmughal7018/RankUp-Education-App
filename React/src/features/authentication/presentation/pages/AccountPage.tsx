import { useEffect, useMemo, useState, type FormEvent } from "react";
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

function userInitials(name?: string | null, username?: string | null) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Teacher / Parent / Student may request school+campus. CampusAdmin may request campus only. */
function schoolChangeMode(
  role: UserRole,
): "none" | "school-campus" | "campus-only" {
  if (role === "PortalAdmin" || role === "SchoolAdmin") {
    return "none";
  }
  if (role === "CampusAdmin") {
    return "campus-only";
  }
  if (role === "Teacher" || role === "Parent" || role === "Student") {
    return "school-campus";
  }
  return "none";
}

type ProfileForm = {
  fullName: string;
  mobileNumber: string;
  emailAddress: string;
  cnic: string;
  schoolId: string;
  campusId: string;
};

function toProfileForm(user: CurrentUser): ProfileForm {
  return {
    fullName: user.fullName || "",
    mobileNumber: user.mobileNumber || "",
    emailAddress: user.emailAddress || "",
    cnic: user.cnic || "",
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
  const [schools, setSchools] = useState<authApi.RegistrationSchoolOption[]>(
    [],
  );
  const [campuses, setCampuses] = useState<authApi.RegistrationCampusOption[]>(
    [],
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

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

  const changeMode = useMemo(
    () => (profile ? schoolChangeMode(profile.role) : "none"),
    [profile],
  );

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
    if (changeMode === "none") {
      setSchools([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSchools(true);
    void authApi
      .listRegistrationSchools()
      .then((items) => {
        if (!cancelled) {
          setSchools(items);
        }
      })
      .catch((caught: ApiError) => {
        if (!cancelled) {
          setProfileError(caught.message || "Unable to load schools.");
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
  }, [changeMode]);

  useEffect(() => {
    const schoolIdValue =
      changeMode === "campus-only"
        ? profile?.schoolId != null
          ? String(profile.schoolId)
          : ""
        : form?.schoolId;

    if (changeMode === "none" || !schoolIdValue) {
      setCampuses([]);
      return;
    }

    const schoolId = Number(schoolIdValue);
    if (!Number.isFinite(schoolId)) {
      setCampuses([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCampuses(true);
    void authApi
      .listRegistrationCampuses(schoolId)
      .then((items) => {
        if (!cancelled) {
          setCampuses(items);
        }
      })
      .catch((caught: ApiError) => {
        if (!cancelled) {
          setProfileError(caught.message || "Unable to load campuses.");
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
  }, [changeMode, form?.schoolId, profile?.schoolId]);

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
    setForm((current) => {
      if (!current) {
        return current;
      }
      if (key === "schoolId") {
        return { ...current, schoolId: value, campusId: "" };
      }
      return { ...current, [key]: value };
    });
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
      let schoolId: number | null = null;
      let campusId: number | null = null;

      if (changeMode === "school-campus") {
        schoolId = form.schoolId ? Number(form.schoolId) : null;
        campusId = form.campusId ? Number(form.campusId) : null;
      } else if (changeMode === "campus-only") {
        schoolId = profile.schoolId;
        campusId = form.campusId ? Number(form.campusId) : null;
      }

      const updated = await authApi.updateProfile({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        emailAddress: form.emailAddress.trim() || null,
        cnic: form.cnic.trim() || null,
        schoolId: Number.isFinite(schoolId as number) ? schoolId : null,
        campusId: Number.isFinite(campusId as number) ? campusId : null,
      });

      setProfile(updated);
      setForm(toProfileForm(updated));
      updateUser(updated);

      if (updated.pendingSchoolChange) {
        setProfileSuccess(
          "Profile saved. School/campus change was submitted for admin approval.",
        );
      } else {
        setProfileSuccess("Profile updated successfully.");
      }
    } catch (caught) {
      const apiError = caught as ApiError;
      setProfileError(apiError.message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
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
  const schoolOptions = schools.map((school) => ({
    value: String(school.id),
    label: school.name,
  }));
  const campusOptions = campuses.map((campus) => ({
    value: String(campus.id),
    label: campus.name,
  }));
  const currentSchoolName =
    schools.find((s) => s.id === profile.schoolId)?.name ??
    (profile.schoolId != null ? `School #${profile.schoolId}` : "—");
  const currentCampusName =
    campuses.find((c) => c.id === profile.campusId)?.name ??
    (profile.campusId != null ? `Campus #${profile.campusId}` : "—");

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
          Contact details save immediately. School/campus changes need admin
          approval.
        </p>

        {profile.pendingSchoolChange ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Pending school/campus change (request #
            {profile.pendingSchoolChange.id}) — waiting for admin approval.
          </div>
        ) : null}

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

            {changeMode === "none" ? (
              <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">School:</span>{" "}
                  {currentSchoolName}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-slate-800">Campus:</span>{" "}
                  {currentCampusName}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Portal and school admins cannot change school or campus from
                  profile.
                </p>
              </div>
            ) : null}

            {changeMode === "school-campus" ? (
              <>
                <div>
                  <FieldLabel htmlFor="schoolId">School</FieldLabel>
                  <SearchableSelect
                    id="schoolId"
                    value={form.schoolId}
                    onChange={(value) => updateField("schoolId", value)}
                    options={schoolOptions}
                    allowEmpty
                    emptyLabel={
                      isLoadingSchools ? "Loading schools..." : "Select school"
                    }
                    placeholder="Select school"
                    disabled={isSavingProfile || isLoadingSchools}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="campusId">Campus</FieldLabel>
                  <SearchableSelect
                    id="campusId"
                    value={form.campusId}
                    onChange={(value) => updateField("campusId", value)}
                    options={campusOptions}
                    allowEmpty
                    emptyLabel={
                      !form.schoolId
                        ? "Select a school first"
                        : isLoadingCampuses
                          ? "Loading campuses..."
                          : "Select campus"
                    }
                    placeholder="Select campus"
                    disabled={
                      isSavingProfile || !form.schoolId || isLoadingCampuses
                    }
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500">
                  Changing school or campus creates an approval request for
                  Campus Admin, School Admin, and Portal Admin (same flow as
                  account access requests).
                </p>
              </>
            ) : null}

            {changeMode === "campus-only" ? (
              <>
                <div>
                  <FieldLabel htmlFor="schoolReadonly">School</FieldLabel>
                  <input
                    id="schoolReadonly"
                    type="text"
                    value={currentSchoolName}
                    disabled
                    className={`${inputClassName} bg-slate-50 text-slate-500`}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="campusId">Campus</FieldLabel>
                  <SearchableSelect
                    id="campusId"
                    value={form.campusId}
                    onChange={(value) => updateField("campusId", value)}
                    options={campusOptions}
                    allowEmpty
                    emptyLabel={
                      isLoadingCampuses
                        ? "Loading campuses..."
                        : "Select campus"
                    }
                    placeholder="Select campus"
                    disabled={isSavingProfile || isLoadingCampuses}
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-slate-500">
                  Campus changes are sent to School Admin and Portal Admin for
                  approval.
                </p>
              </>
            ) : null}
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
