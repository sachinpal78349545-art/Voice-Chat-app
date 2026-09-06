import React, { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  Edit3,
  FileImage,
  Contact,
  Loader2,
  Save,
  UserRound,
  BadgeInfo,
} from "lucide-react";
import { uploadToCloudinary } from "../lib/cloudinary";
import { AVATAR_LIST, updateUser, UserProfile } from "../lib/userService";
import { useToast } from "../lib/toastContext";
import "./EditProfilePage.css";

interface Props {
  user: UserProfile | null;
  onUpdate: (u: UserProfile) => void;
  onBack: () => void;
}

type FormState = {
  name: string;
  bio: string;
  gender: string;
  birthday: string;
  avatar: string;
};

const GENDER_OPTIONS = ["Male", "Female", "Secret"];

function getFormState(user: UserProfile | null): FormState {
  return {
    name: user?.name || "",
    bio: user?.bio || "",
    gender: GENDER_OPTIONS.includes(user?.gender || "") ? user!.gender : "Secret",
    birthday: user?.birthday || "",
    avatar: user?.avatar || "",
  };
}

function formatBirthday(value: string): string {
  if (!value) return "Add date of birth";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Add date of birth";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GR";
}

export default function EditProfilePage({ user, onUpdate, onBack }: Props) {
  const [form, setForm] = useState<FormState>(() => getFormState(user));
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) setForm(getFormState(user));
  }, [user?.uid]);

  if (!user) {
    return (
      <div className="edit-profile-page edit-profile-page--loading" aria-label="Loading profile">
        <div className="edit-profile-shell">
          <div className="edit-profile-skeleton edit-profile-skeleton--title" />
          <div className="edit-profile-skeleton edit-profile-skeleton--subtitle" />
          <div className="edit-profile-skeleton edit-profile-skeleton--avatar" />
          <div className="edit-profile-skeleton edit-profile-skeleton--card" />
        </div>
      </div>
    );
  }

  const avatarIsImage = form.avatar.startsWith("http") || form.avatar.startsWith("data:");
  const permanentId = user.userId || "";

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors(current => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
    setSaveError("");
  };

  const handleCopyId = async () => {
    if (!permanentId) return;
    try {
      await navigator.clipboard?.writeText(permanentId);
      showToast("User ID copied", "success");
    } catch {
      showToast("Could not copy the User ID", "error");
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadProgress(8);
    setSaveError("");

    try {
      let compressed: Blob = file;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.6,
        });
      } catch (compressionError) {
        console.warn("[EditProfile] Image compression failed; uploading original:", compressionError);
      }

      setUploadProgress(28);
      const blob = new Blob([compressed], { type: "image/jpeg" });
      const url = await uploadToCloudinary(blob, progress => {
        setUploadProgress(28 + Math.round(progress * 0.72));
      });

      updateField("avatar", url);
      setShowAvatarPicker(false);
      showToast("Profile photo updated", "success");
    } catch (error) {
      console.error("[EditProfile] Profile photo upload failed:", error);
      setSaveError("We couldn't update your profile photo. Please try again.");
      showToast("Photo upload failed", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const trimmedName = form.name.trim();

    if (!trimmedName) nextErrors.name = "Display name cannot be empty.";
    if (trimmedName.length > 30) nextErrors.name = "Display name must be 30 characters or fewer.";
    if (form.bio.length > 200) nextErrors.bio = "Bio must be 200 characters or fewer.";

    if (form.birthday) {
      const birthday = new Date(`${form.birthday}T00:00:00`);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (
        Number.isNaN(birthday.getTime()) ||
        birthday.getFullYear() < 1900 ||
        birthday > today
      ) {
        nextErrors.birthday = "Enter a valid date of birth.";
      }
    }

    if (!GENDER_OPTIONS.includes(form.gender)) {
      nextErrors.gender = "Choose a supported gender option.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    setSaveError("");
    const updatedFields = {
      name: form.name.trim(),
      bio: form.bio.trim(),
      gender: form.gender,
      birthday: form.birthday,
      avatar: form.avatar,
    };

    try {
      await updateUser(user.uid, updatedFields);
      onUpdate({ ...user, ...updatedFields });
      showToast("Changes saved", "success");
      window.setTimeout(onBack, 500);
    } catch (error) {
      console.error("[EditProfile] Profile save failed:", error);
      setSaveError("We couldn't save your changes. Please check your connection and try again.");
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-shell">
        <header className="edit-profile-header">
          <button className="edit-profile-circle-button" onClick={onBack} aria-label="Go back">
            <span aria-hidden="true">←</span>
          </button>
          <div className="edit-profile-heading">
            <h1>Edit Profile</h1>
            <p>Update your information and manage your profile</p>
          </div>
          <button
            className="edit-profile-circle-button edit-profile-circle-button--check"
            onClick={save}
            disabled={saving || uploading}
            aria-label="Save changes"
          >
            {saving ? <Loader2 size={19} className="edit-profile-spin" /> : <Check size={21} strokeWidth={2.5} />}
          </button>
        </header>

        <section className="edit-profile-photo-section" aria-label="Profile photo">
          <button
            className="edit-profile-avatar-button"
            onClick={() => setShowAvatarPicker(true)}
            aria-label="Change profile picture"
          >
            <span className="edit-profile-avatar">
              {avatarIsImage ? (
                <img src={form.avatar} alt={`${form.name || "Your"} profile`} />
              ) : (
                <span className="edit-profile-avatar-fallback">
                  {form.avatar || getInitials(form.name)}
                </span>
              )}
              {uploading && (
                <span className="edit-profile-avatar-loading">
                  <Loader2 size={25} className="edit-profile-spin" />
                  <small>{uploadProgress}%</small>
                </span>
              )}
            </span>
          </button>
          <button
            className="edit-profile-camera-button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Upload a new profile picture"
          >
            <Camera size={17} strokeWidth={2.5} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="edit-profile-file-input"
            onChange={handleImageUpload}
          />
          <button className="edit-profile-photo-caption" onClick={() => setShowAvatarPicker(true)}>
            Tap to change profile picture
          </button>
        </section>

        <section className="edit-profile-info-card" aria-label="Profile information">
          <div className={`edit-profile-row${errors.name ? " edit-profile-row--error" : ""}`}>
            <span className="edit-profile-row-icon edit-profile-row-icon--lavender"><UserRound size={20} /></span>
            <div className="edit-profile-row-content">
              <label htmlFor="edit-profile-name">Display Name</label>
              <input
                id="edit-profile-name"
                value={form.name}
                onChange={event => updateField("name", event.target.value)}
                maxLength={30}
                placeholder="Your display name"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span className="edit-profile-field-error">{errors.name}</span>}
            </div>
            <Edit3 className="edit-profile-row-action" size={19} strokeWidth={2.2} aria-hidden="true" />
          </div>

          <div className={`edit-profile-row${errors.bio ? " edit-profile-row--error" : ""}`}>
            <span className="edit-profile-row-icon edit-profile-row-icon--pink"><Edit3 size={19} /></span>
            <div className="edit-profile-row-content">
              <label htmlFor="edit-profile-bio">Bio</label>
              <input
                id="edit-profile-bio"
                value={form.bio}
                onChange={event => updateField("bio", event.target.value)}
                maxLength={200}
                placeholder="Tell people about you"
                aria-invalid={Boolean(errors.bio)}
              />
              {errors.bio && <span className="edit-profile-field-error">{errors.bio}</span>}
            </div>
            <Edit3 className="edit-profile-row-action" size={19} strokeWidth={2.2} aria-hidden="true" />
          </div>

          <div className={`edit-profile-row${errors.birthday ? " edit-profile-row--error" : ""}`}>
            <span className="edit-profile-row-icon edit-profile-row-icon--violet"><CalendarDays size={20} /></span>
            <div className="edit-profile-row-content">
              <label htmlFor="edit-profile-birthday">Date of Birth</label>
              <div className="edit-profile-date-control">
                <span className={!form.birthday ? "edit-profile-value--muted" : ""}>{formatBirthday(form.birthday)}</span>
                <input
                  id="edit-profile-birthday"
                  type="date"
                  value={form.birthday}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={event => updateField("birthday", event.target.value)}
                  aria-label="Date of Birth"
                  aria-invalid={Boolean(errors.birthday)}
                />
              </div>
              {errors.birthday && <span className="edit-profile-field-error">{errors.birthday}</span>}
            </div>
            <CalendarDays className="edit-profile-row-action" size={19} strokeWidth={2.2} aria-hidden="true" />
          </div>

          <div className={`edit-profile-row${errors.gender ? " edit-profile-row--error" : ""}`}>
            <span className="edit-profile-row-icon edit-profile-row-icon--blue"><BadgeInfo size={20} /></span>
            <div className="edit-profile-row-content">
              <label htmlFor="edit-profile-gender">Gender</label>
              <div className="edit-profile-select-control">
                <select
                  id="edit-profile-gender"
                  value={form.gender}
                  onChange={event => updateField("gender", event.target.value)}
                  aria-invalid={Boolean(errors.gender)}
                >
                  {GENDER_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <ChevronDown size={18} strokeWidth={2.4} aria-hidden="true" />
              </div>
              {errors.gender && <span className="edit-profile-field-error">{errors.gender}</span>}
            </div>
            <ChevronDown className="edit-profile-row-action edit-profile-row-action--chevron" size={19} strokeWidth={2.3} aria-hidden="true" />
          </div>

          <div className="edit-profile-row edit-profile-row--last">
            <span className="edit-profile-row-icon edit-profile-row-icon--aqua"><Contact size={20} /></span>
            <div className="edit-profile-row-content">
              <span className="edit-profile-row-label">User ID</span>
              <button className="edit-profile-id-value" onClick={handleCopyId} disabled={!permanentId}>
                {permanentId || "Not available"}
              </button>
            </div>
            <span className="edit-profile-readonly-badge">Cannot be changed</span>
          </div>
        </section>

        {saveError && (
          <p className="edit-profile-save-error" role="alert">{saveError}</p>
        )}

        <button className="edit-profile-save-button" onClick={save} disabled={saving || uploading}>
          {saving ? <Loader2 size={19} className="edit-profile-spin" /> : <Save size={19} strokeWidth={2.3} />}
          <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
        </button>

        <div className="edit-profile-bottom-space" />
      </div>

      {showAvatarPicker && (
        <div className="edit-profile-modal-backdrop" onClick={() => setShowAvatarPicker(false)}>
          <div className="edit-profile-avatar-sheet" onClick={event => event.stopPropagation()}>
            <div className="edit-profile-sheet-handle" />
            <div className="edit-profile-sheet-heading">
              <div>
                <h2>Profile picture</h2>
                <p>Choose a photo or use an avatar</p>
              </div>
              <button onClick={() => setShowAvatarPicker(false)} aria-label="Close profile picture picker">×</button>
            </div>
            <button className="edit-profile-upload-option" onClick={() => fileRef.current?.click()}>
              <span className="edit-profile-upload-option-icon"><FileImage size={19} /></span>
              <span>
                <strong>Upload a photo</strong>
                <small>Use a picture from your device</small>
              </span>
              <ChevronDown size={17} className="edit-profile-upload-arrow" />
            </button>
            <p className="edit-profile-avatar-option-label">Or choose an avatar</p>
            <div className="edit-profile-avatar-grid">
              {AVATAR_LIST.map(avatar => (
                <button
                  key={avatar}
                  className={form.avatar === avatar ? "edit-profile-avatar-option edit-profile-avatar-option--active" : "edit-profile-avatar-option"}
                  onClick={() => {
                    updateField("avatar", avatar);
                    setShowAvatarPicker(false);
                  }}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}