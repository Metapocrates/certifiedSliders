import ServerActionImageUploader from '@/components/shared/ServerActionImageUploader';
import { uploadBlogImage } from '@/app/(protected)/admin/blog/actions';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
  helperText?: string;
}

export default function ImageUploader(props: ImageUploaderProps) {
  return (
    <ServerActionImageUploader
      {...props}
      uploadAction={uploadBlogImage}
    />
  );
}
