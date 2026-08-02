import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppConfirmDialog } from "@/components/ui/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ApiError, CurrentUser, UserRole } from "@/core/api/types";
import { dashboardPathForRole, getRoleLabel } from "@/core/api/types";
import { FieldLabel } from "@/core/components/FieldLabel";
import { PageHeader } from "@/core/components/PageHeader";
import { SearchableSelect } from "@/core/components/SearchableSelect";
import * as authApi from "@/features/authentication/data/authApi";
import { resolvePublicUrl } from "@/features/authentication/domain/avatarUrl";
import { AvatarUploadDialog } from "@/features/authentication/presentation/components/AvatarUploadDialog";
import { useAuth } from "@/features/authentication/presentation/context/AuthProvider";
import { FORM_FIELD_CLASS } from "@/lib/constants/form-field";

const fieldClass = FORM_FIELD_CLASS;

const SCHOOL_CHANGE_ROLES: UserRole[] = ["Teacher", "Student", "CampusAdmin"];

const REQUESTABLE_ROLES = ["Parent", "Teacher"] as const;

/** Roles the user may remove themselves when another role remains. */
const REMOVABLE_ROLES: UserRole[] = ["Parent", "Teacher"];

type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

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

type RoleRequestForm = {
  schoolId: string;
  campusId: string;
  teacherCode: string;
  reasonMessage: string;
};

const emptyRoleRequestForm: RoleRequestForm = {
  schoolId: "",
  campusId: "",
  teacherCode: "",
  reasonMessage: "",
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
  tone: "error" | "success" | "warn" | "info";
  children: ReactNode;
}) {
  const map = {
    error:
      "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-200",
    success:
      "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    warn: "border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    info: "border-border bg-muted text-muted-foreground",
  } as const;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs leading-snug ${map[tone]}`}
    >
      {children}
    </div>
  );
}

function SectionCard({
  id,
  title,
  description,
  className = "",
  titleClassName = "text-foreground",
  descriptionClassName = "text-muted-foreground",
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <header>
        <h2 className={`text-sm font-semibold ${titleClassName}`}>{title}</h2>
        {description ? (
          <p className={`mt-0.5 text-xs ${descriptionClassName}`}>
            {description}
          </p>
        ) : null}
      </header>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/** Profile, roles, school change, avatar, password, and deactivation settings. */
export function AccountPage() {
  const { user, updateUser, logout, switchRole, removeMyRole, isSubmitting } =
    useAuth();
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

  const [selectedRoleRequest, setSelectedRoleRequest] =
    useState<RequestableRole | null>(null);
  const [roleForm, setRoleForm] = useState<RoleRequestForm>(
    emptyRoleRequestForm,
  );
  const [roleCampuses, setRoleCampuses] = useState<
    authApi.RegistrationCampusOption[]
  >([]);
  const [isLoadingRoleCampuses, setIsLoadingRoleCampuses] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<UserRole | null>(null);
  const [isRemovingRole, setIsRemovingRole] = useState(false);

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

  const accountRoles: UserRole[] =
    profile && Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : profile
        ? [profile.role]
        : [];
  const isPortalAdmin = profile?.role === "PortalAdmin";
  const isStudentRole = profile?.role === "Student";
  const pendingRoleRequest = profile?.pendingRoleRequest ?? null;
  const availableRoleRequests: RequestableRole[] =
    !profile || isPortalAdmin || isStudentRole || pendingRoleRequest
      ? []
      : REQUESTABLE_ROLES.filter((role) => !accountRoles.includes(role));
  const activeRoleChoice: RequestableRole | null =
    selectedRoleRequest && availableRoleRequests.includes(selectedRoleRequest)
      ? selectedRoleRequest
      : (availableRoleRequests[0] ?? null);
  const needsSchoolsForRoleRequest = availableRoleRequests.includes("Teacher");

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
    if (!canRequestSchoolChange && !needsSchoolsForRoleRequest) return;
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
  }, [canRequestSchoolChange, needsSchoolsForRoleRequest]);

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
    const schoolId = roleForm.schoolId ? Number(roleForm.schoolId) : NaN;
    if (activeRoleChoice !== "Teacher" || !Number.isFinite(schoolId)) {
      setRoleCampuses([]);
      return;
    }
    let cancelled = false;
    setIsLoadingRoleCampuses(true);
    void authApi
      .listRegistrationCampuses(schoolId)
      .then((items) => {
        if (!cancelled) setRoleCampuses(items.filter((c) => c.isActive));
      })
      .catch(() => {
        if (!cancelled) setRoleCampuses([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoleCampuses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoleChoice, roleForm.schoolId]);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash || isLoadingProfile) return;
    if (hash === "avatar") {
      setAvatarOpen(true);
      return;
    }
    document
      .getElementById(hash)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function updateRoleField<K extends keyof RoleRequestForm>(
    key: K,
    value: RoleRequestForm[K],
  ) {
    setRoleForm((current) => ({ ...current, [key]: value }));
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
    if (!form.emailAddress.trim()) {
      setProfileError("Email address is required (it is the username).");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: form.fullName.trim(),
        mobileNumber: form.mobileNumber.trim() || null,
        emailAddress: form.emailAddress.trim() || null,
        cnic: form.cnic.trim() || null,
      });
      setProfile(updated);
      setForm(toProfileForm(updated));
      setSchoolForm(toSchoolChangeForm(updated));
      updateUser(updated);
      setProfileSuccess("Profile saved.");
    } catch (caught) {
      setProfileError(
        (caught as ApiError).message || "Unable to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleRoleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeRoleChoice) return;
    setRoleError(null);
    setRoleSuccess(null);

    if (activeRoleChoice === "Teacher") {
      if (!roleForm.schoolId) {
        setRoleError("Select the school you teach at.");
        return;
      }
      if (!roleForm.campusId) {
        setRoleError("Select the campus you teach at.");
        return;
      }
      if (!roleForm.teacherCode.trim()) {
        setRoleError("Teacher code is required.");
        return;
      }
    }

    setIsSubmittingRole(true);
    try {
      const result = await authApi.requestAdditionalRole({
        role: activeRoleChoice,
        schoolId:
          activeRoleChoice === "Teacher" && roleForm.schoolId
            ? Number(roleForm.schoolId)
            : null,
        campusId:
          activeRoleChoice === "Teacher" && roleForm.campusId
            ? Number(roleForm.campusId)
            : null,
        teacherCode:
          activeRoleChoice === "Teacher"
            ? roleForm.teacherCode.trim() || null
            : null,
        reasonMessage: roleForm.reasonMessage.trim() || null,
      });
      setRoleForm(emptyRoleRequestForm);
      setSelectedRoleRequest(null);
      const refreshed = await authApi.getCurrentUser();
      setProfile(refreshed);
      setForm(toProfileForm(refreshed));
      setSchoolForm(toSchoolChangeForm(refreshed));
      updateUser(refreshed);
      setRoleSuccess(
        result.message ||
          `Request for the ${getRoleLabel(activeRoleChoice)} role was submitted for review.`,
      );
    } catch (caught) {
      setRoleError(
        (caught as ApiError).message || "Unable to submit role request.",
      );
    } finally {
      setIsSubmittingRole(false);
    }
  }

  async function handleSwitchToRole(role: UserRole) {
    if (!profile || role === profile.role) {
      return;
    }
    setRoleError(null);
    setRoleSuccess(null);
    try {
      const updated = await switchRole(role);
      setProfile(updated);
      setForm(toProfileForm(updated));
      setSchoolForm(toSchoolChangeForm(updated));
      setRoleSuccess(`Now using ${getRoleLabel(role)}.`);
      navigate(dashboardPathForRole(updated.role), { replace: true });
    } catch (caught) {
      setRoleError((caught as ApiError).message || "Unable to switch role.");
    }
  }

  async function confirmRemoveRole() {
    if (!roleToRemove || !profile) {
      return;
    }
    setRoleError(null);
    setRoleSuccess(null);
    setIsRemovingRole(true);
    const removed = roleToRemove;
    try {
      const updated = await removeMyRole(removed);
      setRoleToRemove(null);
      setProfile(updated);
      setForm(toProfileForm(updated));
      setSchoolForm(toSchoolChangeForm(updated));
      setRoleSuccess(`${getRoleLabel(removed)} was removed from your account.`);
      if (updated.role !== profile.role) {
        navigate(dashboardPathForRole(updated.role), { replace: true });
      }
    } catch (caught) {
      setRoleError((caught as ApiError).message || "Unable to remove role.");
      setRoleToRemove(null);
    } finally {
      setIsRemovingRole(false);
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
      setPasswordError(
        (caught as ApiError).message || "Unable to change password.",
      );
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
        <p className="text-sm text-muted-foreground">
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
    schools.find((s) => String(s.id) === String(profile.schoolId))?.name ?? null;
  const campusLabel =
    campuses.find((c) => String(c.id) === String(profile.campusId))?.name ??
    null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        description="Manage your profile, roles, and security."
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            id="avatar"
            onClick={() => setAvatarOpen(true)}
            aria-label="Change photo"
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted text-lg font-bold text-foreground ring-1 ring-border outline-none transition hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
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
            <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-background opacity-0 transition group-hover:opacity-100">
              Edit
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {form.fullName || profile.username}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {accountRoles.map((role) => (
                <span
                  key={role}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    role === profile.role
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getRoleLabel(role)}
                </span>
              ))}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="truncate">{profile.username}</span>
              {schoolLabel ? (
                <span className="truncate">
                  {schoolLabel}
                  {campusLabel ? ` · ${campusLabel}` : ""}
                </span>
              ) : null}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAvatarOpen(true)}
          >
            <span className="hidden sm:inline">Update photo</span>
            <span className="sm:hidden">Photo</span>
          </Button>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <SectionCard
            id="profile"
            title="Personal details"
            description="Name and contact — school changes are handled separately."
          >
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
                  <FieldLabel htmlFor="mobileNumber" optional>
                    Mobile
                  </FieldLabel>
                  <input
                    id="mobileNumber"
                    type="tel"
                    value={form.mobileNumber}
                    onChange={(e) => updateField("mobileNumber", e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="emailAddress" required>
                    Email (username)
                  </FieldLabel>
                  <input
                    id="emailAddress"
                    type="email"
                    required
                    value={form.emailAddress}
                    onChange={(e) => updateField("emailAddress", e.target.value)}
                    className={fieldClass}
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
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingProfile || isLoadingProfile}
                >
                  {isSavingProfile ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            id="roles"
            title="Roles"
            description="Roles on this account and requests for another one."
          >
            <ul className="space-y-2">
              {accountRoles.map((role) => {
                const isCurrentSession = role === profile.role;
                const canRemove =
                  accountRoles.length > 1 && REMOVABLE_ROLES.includes(role);
                const busy = isSubmitting || isRemovingRole || isSubmittingRole;

                return (
                  <li
                    key={role}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                      isCurrentSession
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{getRoleLabel(role)}</span>
                      {isCurrentSession ? (
                        <span className="ml-2 shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Current
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-2">
                      {!isCurrentSession && accountRoles.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleSwitchToRole(role)}
                        >
                          Switch to this
                        </Button>
                      ) : null}
                      {canRemove ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => {
                            setRoleError(null);
                            setRoleToRemove(role);
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            {roleError ? <Notice tone="error">{roleError}</Notice> : null}
            {roleSuccess ? <Notice tone="success">{roleSuccess}</Notice> : null}

            {isStudentRole ? (
              <Notice tone="info">
                Student accounts cannot add other roles.
              </Notice>
            ) : isPortalAdmin ? null : pendingRoleRequest ? (
              <Notice tone="warn">
                A request for the{" "}
                <span className="font-semibold">
                  {getRoleLabel(pendingRoleRequest.requestedRole as UserRole)}
                </span>{" "}
                role is pending admin review. Your account stays active while it
                is reviewed.
              </Notice>
            ) : availableRoleRequests.length === 0 ? (
              <Notice tone="info">
                You already have every role that can be requested here.
              </Notice>
            ) : (
              <div className="space-y-3">
                <form
                  className="space-y-3"
                  onSubmit={(e) => void handleRoleRequestSubmit(e)}
                >
                  {availableRoleRequests.length > 1 ? (
                    <div>
                      <FieldLabel htmlFor="roleChoice" required>
                        Role to request
                      </FieldLabel>
                      <div
                        id="roleChoice"
                        className="flex flex-wrap gap-2"
                        role="group"
                      >
                        {availableRoleRequests.map((role) => {
                          const isChosen = role === activeRoleChoice;
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setSelectedRoleRequest(role);
                                setRoleError(null);
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                                isChosen
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-card text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {getRoleLabel(role)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      You can request the{" "}
                      <span className="font-semibold text-foreground">
                        {activeRoleChoice
                          ? getRoleLabel(activeRoleChoice)
                          : "—"}
                      </span>{" "}
                      role.
                    </p>
                  )}

                  {activeRoleChoice === "Teacher" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor="roleSchoolId" required>
                          School
                        </FieldLabel>
                        <SearchableSelect
                          id="roleSchoolId"
                          disabled={isSubmittingRole || isLoadingSchools}
                          value={roleForm.schoolId}
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
                            updateRoleField("schoolId", next);
                            updateRoleField("campusId", "");
                          }}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="roleCampusId" required>
                          Campus
                        </FieldLabel>
                        <SearchableSelect
                          id="roleCampusId"
                          disabled={
                            isSubmittingRole ||
                            !roleForm.schoolId ||
                            isLoadingRoleCampuses
                          }
                          value={roleForm.campusId}
                          allowEmpty
                          emptyLabel={
                            !roleForm.schoolId
                              ? "School first"
                              : isLoadingRoleCampuses
                                ? "Loading…"
                                : "Select campus"
                          }
                          placeholder={
                            !roleForm.schoolId
                              ? "School first"
                              : isLoadingRoleCampuses
                                ? "Loading…"
                                : "Select campus"
                          }
                          options={roleCampuses.map((campus) => ({
                            value: String(campus.id),
                            label: campus.name,
                          }))}
                          onChange={(next) =>
                            updateRoleField("campusId", next)
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel htmlFor="roleTeacherCode" required>
                          Teacher code
                        </FieldLabel>
                        <input
                          id="roleTeacherCode"
                          type="text"
                          value={roleForm.teacherCode}
                          onChange={(e) =>
                            updateRoleField("teacherCode", e.target.value)
                          }
                          className={fieldClass}
                          placeholder="Code issued by your school"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <FieldLabel htmlFor="roleReason" optional>
                      Message for the reviewer
                    </FieldLabel>
                    <textarea
                      id="roleReason"
                      rows={3}
                      value={roleForm.reasonMessage}
                      onChange={(e) =>
                        updateRoleField("reasonMessage", e.target.value)
                      }
                      className={fieldClass}
                      placeholder={
                        activeRoleChoice === "Parent"
                          ? "Which students should be linked to you?"
                          : "Anything the reviewer should know"
                      }
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Your account stays active while the request is pending.
                  </p>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingRole || !activeRoleChoice}
                    >
                      {isSubmittingRole ? "Submitting…" : "Request role"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </SectionCard>

          {canRequestSchoolChange && schoolForm ? (
            <SectionCard
              id="school-campus"
              title="School / campus"
              description={
                isCampusAdminOnly
                  ? "Campus only — confirming locks your login for admin review."
                  : "Confirming locks your login until an admin reviews the request."
              }
            >
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
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingSchoolChange || isLoadingProfile}
                  >
                    {isSavingSchoolChange ? "Submitting…" : "Request change"}
                  </Button>
                </div>
              </form>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-5">
          <SectionCard
            id="password"
            title="Password"
            description="Change the password used to sign in."
          >
            {passwordError ? <Notice tone="error">{passwordError}</Notice> : null}
            {passwordSuccess ? (
              <Notice tone="success">{passwordSuccess}</Notice>
            ) : null}
            <form
              className="space-y-3"
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
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={fieldClass}
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
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldClass}
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={isSubmittingPassword}
              >
                {isSubmittingPassword ? "Updating…" : "Update password"}
              </Button>
            </form>
          </SectionCard>

          {canDeactivateAccount ? (
            <SectionCard
              id="deactivate"
              title="Danger zone"
              description="Deactivating disables login until an admin restores the account."
              className="border-destructive/30"
              titleClassName="text-destructive"
              descriptionClassName="text-destructive/80"
            >
              {deactivateError ? (
                <Notice tone="error">{deactivateError}</Notice>
              ) : null}
              <form
                className="space-y-3"
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
                <label className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs leading-snug text-foreground">
                  <input
                    type="checkbox"
                    checked={deactivateConfirm}
                    onChange={(e) => setDeactivateConfirm(e.target.checked)}
                    className="mt-0.5 rounded border-input text-destructive focus:ring-ring"
                  />
                  <span>I understand I will be signed out immediately.</span>
                </label>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={isDeactivating || !deactivateConfirm}
                >
                  {isDeactivating ? "Deactivating…" : "Deactivate account"}
                </Button>
              </form>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <AppConfirmDialog
        open={confirmSchoolChangeOpen}
        onOpenChange={setConfirmSchoolChangeOpen}
        title="Lock account for school change?"
        description="Your account will lock until an admin for the destination school or campus approves or rejects this request. You will be signed out now."
        confirmLabel="Confirm & lock"
        loading={isSavingSchoolChange}
        onConfirm={() => void confirmSchoolChangeRequest()}
      />

      <AppConfirmDialog
        open={roleToRemove != null}
        onOpenChange={(open) => {
          if (!open && !isRemovingRole) {
            setRoleToRemove(null);
          }
        }}
        title="Remove role?"
        description={
          roleToRemove
            ? `Remove ${getRoleLabel(roleToRemove)} from your account? You can request it again later. Your other role will stay.`
            : ""
        }
        confirmLabel="Remove role"
        loading={isRemovingRole}
        onConfirm={() => void confirmRemoveRole()}
      />

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
