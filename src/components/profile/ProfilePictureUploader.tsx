'use client';

import ServerActionImageUploader from '@/components/shared/ServerActionImageUploader';
import { uploadAvatar } from '@/app/athletes/actions';

interface ProfilePictureUploaderProps {
  currentImageUrl?: string;
  onImageUploaded?: (url: string) => void;
}

export default function ProfilePictureUploader({
  currentImageUrl,
  onImageUploaded,
}: ProfilePictureUploaderProps) {
  const handleUpload = (url: string) => {
    if (onImageUploaded) {
      onImageUploaded(url);
    }
    // Reload the page to show the new avatar everywhere
    window.location.reload();
  };

  return (
    <ServerActionImageUploader
      onImageUploaded={handleUpload}
      uploadAction={async (formData) => {
        // Rename 'image' to 'avatar' for the uploadAvatar action
        const avatarFile = formData.get('image');
        if (avatarFile) {
          const newFormData = new FormData();
          newFormData.append('avatar', avatarFile);
          return uploadAvatar(newFormData);
        }
        return { ok: false, message: 'No file provided' };
      }}
      currentImageUrl={currentImageUrl}
      label="Profile Picture"
      helperText="Upload a profile picture that will be shown on your public profile"
    />
  );
}
